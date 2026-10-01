/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getActiveAttachments,
  getLatestVersion,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';

/** Attachment type constants — kept local to avoid depending on security_solution. */
const TYPE_ALERT = 'security.alert';
const TYPE_ALERTS = 'security.alerts';
const TYPE_ATTACK_DISCOVERY = 'security.attack_discovery';
const TYPE_ENTITY = 'security.entity';
const TYPE_RULE = 'security.rule';

/** Pattern that distinguishes a security alert backing index from a plain event index. */
const SECURITY_ALERT_INDEX_PATTERN = '.alerts-security.alerts-';

/** Normalised targets extracted from a conversation's attachments. */
export interface AttachmentTargets {
  /** Deduplicated alert `_id` values from `security.alert` + `security.alerts`. */
  alertIds: readonly string[];
  /** Earliest `created_at` across alert attachments (ISO string) or undefined when empty. */
  alertsCreatedAt: string | undefined;
  /** Latest `created_at` across alert attachments (ISO string) or undefined when empty. */
  alertsUpdatedAt: string | undefined;

  /** Deduplicated attack discovery ids from `security.attack_discovery`. */
  attackIds: readonly string[];
  attacksCreatedAt: string | undefined;
  attacksUpdatedAt: string | undefined;

  /** Deduplicated entity keys (EUID when present, else `identifierType:identifier`). */
  entityKeys: readonly string[];
  /** Flat list of entity name/id terms for a KQL query. Each entry is the best available
   *  identifier: `entityStoreId` when present (EUID), otherwise the display `identifier`. */
  entityTerms: readonly string[];

  /**
   * First rule origin found (deduplicated by origin). `origin` is the rule_id or saved-object id;
   * the first label is the best display name for a single-rule search.
   */
  ruleOrigins: readonly string[];
  /** Best display label for the first rule (from `attachmentLabel` or parsed `text.name`). */
  firstRuleLabel: string | undefined;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Parses the `data.alert` JSON string from a `security.alert` attachment.
 *  Returns the `_id` string or `undefined` on failure. */
const parseAlertId = (data: unknown): string | undefined => {
  if (typeof data !== 'object' || data === null) return undefined;
  const record = data as Record<string, unknown>;
  const rawAlert = record.alert;
  if (typeof rawAlert !== 'string') return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawAlert);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined;

  const doc = parsed as Record<string, unknown>;

  // Validate that this is a security alert, not a plain event.
  // _index can be a plain string (alerts-table path) or an array (flyout path via getRawData).
  const rawIndex = doc._index;
  const index = Array.isArray(rawIndex) ? (rawIndex[0] as string) : (rawIndex as string);
  if (typeof index !== 'string' || !index.includes(SECURITY_ALERT_INDEX_PATTERN)) {
    return undefined;
  }

  // _id can be a plain string (alerts-table path) or an array (flyout path).
  const rawId = doc._id;
  if (Array.isArray(rawId)) return typeof rawId[0] === 'string' ? rawId[0] : undefined;
  return typeof rawId === 'string' ? rawId : undefined;
};

/** Returns the ISO string of the first (oldest) version's `created_at`. */
const firstCreatedAt = (attachment: VersionedAttachment): string | undefined =>
  attachment.versions.length > 0 ? attachment.versions[0].created_at : undefined;

const minDate = (a: string | undefined, b: string | undefined): string | undefined => {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
};

const maxDate = (a: string | undefined, b: string | undefined): string | undefined => {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Extracts deduplicated link targets from a conversation's active attachments. */
export const extractAttachmentTargets = (
  attachments: readonly VersionedAttachment[]
): AttachmentTargets => {
  const active = getActiveAttachments(attachments as VersionedAttachment[]);

  const alertIdSet = new Set<string>();
  let alertsCreatedAt: string | undefined;
  let alertsUpdatedAt: string | undefined;

  const attackIdSet = new Set<string>();
  let attacksCreatedAt: string | undefined;
  let attacksUpdatedAt: string | undefined;

  const entityKeySet = new Set<string>();
  const entityTermsList: string[] = [];

  const ruleOriginSet = new Set<string>();
  let firstRuleLabel: string | undefined;

  for (const attachment of active) {
    const { type, origin } = attachment;
    const data = getLatestVersion(attachment)?.data as Record<string, unknown> | undefined;
    const ts = firstCreatedAt(attachment);

    if (type === TYPE_ALERT) {
      const id = parseAlertId(data);
      if (id && !alertIdSet.has(id)) {
        alertIdSet.add(id);
        alertsCreatedAt = minDate(alertsCreatedAt, ts);
        alertsUpdatedAt = maxDate(alertsUpdatedAt, ts);
      }
    } else if (type === TYPE_ALERTS) {
      const ids = data?.alertIds;
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (typeof id === 'string' && !alertIdSet.has(id)) {
            alertIdSet.add(id);
            alertsCreatedAt = minDate(alertsCreatedAt, ts);
            alertsUpdatedAt = maxDate(alertsUpdatedAt, ts);
          }
        }
      }
    } else if (type === TYPE_ATTACK_DISCOVERY) {
      // data.id is the persisted document _id; fall back to origin (also the doc _id).
      const id = (data?.id as string | undefined) ?? (origin as string | undefined);
      if (id && !attackIdSet.has(id)) {
        attackIdSet.add(id);
        attacksCreatedAt = minDate(attacksCreatedAt, ts);
        attacksUpdatedAt = maxDate(attacksUpdatedAt, ts);
      }
    } else if (type === TYPE_ENTITY) {
      // Support both the single-entity shape and the multi-entity shape.
      if (data?.entities != null && Array.isArray(data.entities)) {
        for (const entity of data.entities as Array<Record<string, unknown>>) {
          const key =
            (entity.entityStoreId as string | undefined) ??
            `${entity.identifierType}:${entity.identifier}`;
          if (!entityKeySet.has(key)) {
            entityKeySet.add(key);
            // Use EUID when available (entity.id on the Security page), else entity.name.
            const term =
              (entity.entityStoreId as string | undefined) ??
              (entity.identifier as string | undefined) ??
              key;
            entityTermsList.push(term);
          }
        }
      } else if (data?.identifierType != null) {
        const key =
          (data.entityStoreId as string | undefined) ?? `${data.identifierType}:${data.identifier}`;
        if (!entityKeySet.has(key)) {
          entityKeySet.add(key);
          const term =
            (data.entityStoreId as string | undefined) ??
            (data.identifier as string | undefined) ??
            key;
          entityTermsList.push(term);
        }
      }
    } else if (type === TYPE_RULE) {
      const originVal = origin as string | undefined;
      if (originVal && !ruleOriginSet.has(originVal)) {
        ruleOriginSet.add(originVal);
        if (!firstRuleLabel) {
          // Best label: attachmentLabel, then parsed text.name, then undefined.
          const label = data?.attachmentLabel as string | undefined;
          if (label) {
            firstRuleLabel = label;
          } else {
            const rawText = data?.text;
            if (typeof rawText === 'string') {
              try {
                const parsed = JSON.parse(rawText) as Record<string, unknown>;
                if (typeof parsed?.name === 'string') firstRuleLabel = parsed.name;
              } catch {
                // prose or invalid JSON — no label
              }
            }
          }
        }
      }
    }
  }

  return {
    alertIds: [...alertIdSet],
    alertsCreatedAt,
    alertsUpdatedAt,
    attackIds: [...attackIdSet],
    attacksCreatedAt,
    attacksUpdatedAt,
    entityKeys: [...entityKeySet],
    entityTerms: entityTermsList,
    ruleOrigins: [...ruleOriginSet],
    firstRuleLabel,
  };
};
