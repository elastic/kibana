/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RESOLUTION_RULE_KINDS,
  RESOLUTION_RULE_IDS,
  type ResolutionRuleKind,
  type ResolutionRuleId,
} from '../../../../common/domain/resolution_rules/constants';

/*
 * RLIKE patterns below are Lucene automaton syntax, not PCRE / java.util.regex:
 * matching is already whole-string, and `^` / `$` are literal characters, not
 * anchors. A prefix therefore needs an explicit `.*`.
 * https://www.elastic.co/docs/reference/query-languages/query-dsl/regexp-syntax
 */

/**
 * Well-known Windows SIDs that identify the host or a built-in group, not a person.
 * LocalSystem / LocalService / NetworkService plus built-in aliases S-1-5-32-544..554.
 */
export const WINDOWS_NON_PERSON_SID_EXCLUSION =
  '(S-1-5-18|S-1-5-19|S-1-5-20|S-1-5-32-54[4-9]|S-1-5-32-55[0-4])';

/** Entra ObjectId / AccountObjectId GUID shape. */
export const ENTRA_GUID_INCLUSION = '[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}';

/**
 * NT-authority SID prefix. `local` and CrowdStrike `user.id` can be a Linux UID
 * or a SID; only this shape is safe to bridge to AD.
 */
export const NT_AUTHORITY_SID_INCLUSION = 'S-1-5-.*';

/**
 * Cheap UPN shape: at least one character, `@`, at least one character.
 * Lucene automaton syntax (no `^`/`$`); a trailing dot is not required
 * (`jane@CORP` is a real on-prem UPN).
 */
export const UPN_INCLUSION = '[^@]+@[^@]+';

export type EsqlMatchSpec = {
  /** Empty means every namespace (email rule). */
  namespaces: readonly string[];
  lowercase: boolean;
  inclusionPattern?: string;
  exclusionPattern?: string;
  /**
   * Unresolved entities from these namespaces may share a match value without
   * declining the group. Empty (the default) keeps the same-namespace guard for
   * every namespace.
   */
  allowDuplicateUnresolvedNamespaces?: readonly string[];
} & (
  | { field: string; fieldByNamespace?: never }
  | { field?: never; fieldByNamespace: Readonly<Record<string, string>> }
);

export interface ResolutionRuleConfig {
  id: ResolutionRuleId;
  kind: ResolutionRuleKind;
  description: string;
  defaultEnabled: boolean;
  /**
   * Parameterized ES|QL matcher. Absent for rules that use a different query
   * shape (`related_user_alias_resolution` stays on Query DSL).
   */
  matcher?: EsqlMatchSpec;
}

export const RESOLUTION_RULE_CONFIGS: ResolutionRuleConfig[] = [
  {
    id: RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH,
    kind: RESOLUTION_RULE_KINDS.SAME_FIELD,
    description:
      'Links user entities that share the same email address, compared case-insensitively, across identity providers. Disable if shared mailboxes or role accounts produce false links.',
    defaultEnabled: true,
    matcher: {
      field: 'user.email',
      namespaces: [],
      lowercase: true,
    },
  },
  {
    id: RESOLUTION_RULE_IDS.WINDOWS_SID_BRIDGE,
    kind: RESOLUTION_RULE_KINDS.SAME_FIELD,
    description:
      'Links local Windows and CrowdStrike endpoint user entities to Active Directory by SID (`user.id`), excluding well-known SIDs such as LocalSystem and Linux numeric UIDs. Needs Windows or CrowdStrike endpoint events (which create `local` user entities) and Active Directory entity analytics. Several `local` entities sharing one domain SID are treated as one account. Disable if well-known SID exclusions are not enough for your environment.',
    defaultEnabled: true,
    matcher: {
      field: 'user.id',
      namespaces: ['local', 'system', 'windows', 'crowdstrike', 'active_directory'],
      lowercase: false,
      inclusionPattern: NT_AUTHORITY_SID_INCLUSION,
      exclusionPattern: WINDOWS_NON_PERSON_SID_EXCLUSION,
      allowDuplicateUnresolvedNamespaces: ['local'],
    },
  },
  {
    id: RESOLUTION_RULE_IDS.ENTRA_GUID_BRIDGE,
    kind: RESOLUTION_RULE_KINDS.SAME_FIELD,
    description:
      'Links Microsoft Defender (`m365_defender`) identities to Entra ID by GUID-shaped `user.id`. Needs Defender identity events and Entra entity analytics. Disable if Defender SID IAM events leak through the GUID gate.',
    defaultEnabled: true,
    matcher: {
      field: 'user.id',
      namespaces: ['m365_defender', 'entra_id'],
      lowercase: false,
      inclusionPattern: ENTRA_GUID_INCLUSION,
    },
  },
  {
    id: RESOLUTION_RULE_IDS.UPN_CROSS_FIELD_BRIDGE,
    kind: RESOLUTION_RULE_KINDS.CROSS_FIELD,
    description:
      'Links Microsoft 365 audit actors (`user.id` UPN) to Entra users (`user.name` UPN), compared case-insensitively. Needs o365 audit events that create user entities (`event.kind: asset`) and Entra entity analytics. Disabled by default because those events currently do not create entities; enable if your environment emits them as asset events.',
    defaultEnabled: false,
    matcher: {
      fieldByNamespace: {
        microsoft_365: 'user.id',
        entra_id: 'user.name',
      },
      namespaces: ['microsoft_365', 'entra_id'],
      lowercase: true,
      inclusionPattern: UPN_INCLUSION,
    },
  },
  {
    id: RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION,
    kind: RESOLUTION_RULE_KINDS.RELATED_USER_ALIAS_RESOLUTION,
    description: 'Related user alias resolution across identity providers',
    defaultEnabled: false,
  },
];

export const getResolutionRuleConfig = (id: ResolutionRuleId): ResolutionRuleConfig | undefined =>
  RESOLUTION_RULE_CONFIGS.find((config) => config.id === id);
