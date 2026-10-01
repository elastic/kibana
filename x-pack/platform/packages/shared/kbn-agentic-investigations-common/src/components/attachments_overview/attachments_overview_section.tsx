/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { extractAttachmentTargets } from './extract_attachment_targets';
import {
  buildAlertsPageUrl,
  buildAttacksPageUrl,
  buildEntityAnalyticsPageUrl,
  buildRulesPageUrl,
} from './build_security_urls';
import { ATTACHMENTS_OVERVIEW_LABELS } from './translations';

export interface AttachmentsOverviewSectionProps {
  attachments: readonly VersionedAttachment[];
  /** Builds a Security app URL for the given path, including base path and space prefix. */
  getSecurityAppUrl: (path: string) => string;
}

interface AttachmentRow {
  label: string;
  href: string;
}

/** Renders the "Attachments" subsection inside the investigation Overview tab.
 *  Rows appear only for types that have at least one item and a resolvable URL. */
export const AttachmentsOverviewSection = memo<AttachmentsOverviewSectionProps>(
  ({ attachments, getSecurityAppUrl }) => {
    const targets = useMemo(() => extractAttachmentTargets(attachments), [attachments]);

    const rows = useMemo((): AttachmentRow[] => {
      const result: AttachmentRow[] = [];

      if (targets.alertIds.length > 0 && targets.alertsCreatedAt && targets.alertsUpdatedAt) {
        const href = buildAlertsPageUrl(
          getSecurityAppUrl,
          targets.alertIds,
          targets.alertsCreatedAt,
          targets.alertsUpdatedAt
        );
        if (href)
          result.push({ label: ATTACHMENTS_OVERVIEW_LABELS.alerts(targets.alertIds.length), href });
      }

      if (targets.attackIds.length > 0 && targets.attacksCreatedAt && targets.attacksUpdatedAt) {
        const href = buildAttacksPageUrl(
          getSecurityAppUrl,
          targets.attackIds,
          targets.attacksCreatedAt,
          targets.attacksUpdatedAt
        );
        if (href)
          result.push({
            label: ATTACHMENTS_OVERVIEW_LABELS.attacks(targets.attackIds.length),
            href,
          });
      }

      if (targets.entityKeys.length > 0) {
        const href = buildEntityAnalyticsPageUrl(getSecurityAppUrl, targets.entityTerms);
        if (href)
          result.push({
            label: ATTACHMENTS_OVERVIEW_LABELS.entities(targets.entityKeys.length),
            href,
          });
      }

      if (targets.ruleOrigins.length > 0) {
        result.push({
          label: ATTACHMENTS_OVERVIEW_LABELS.rules(targets.ruleOrigins.length),
          href: buildRulesPageUrl(
            getSecurityAppUrl,
            targets.ruleOrigins.length,
            targets.ruleOrigins[0]
          ),
        });
      }

      return result;
    }, [targets, getSecurityAppUrl]);

    if (rows.length === 0) return null;

    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{ATTACHMENTS_OVERVIEW_LABELS.sectionTitle}</h4>
          </EuiTitle>
        </EuiFlexItem>
        {rows.map((row, index) => (
          <React.Fragment key={row.href}>
            {index > 0 && <EuiHorizontalRule margin="none" />}
            <EuiFlexItem>
              <EuiText size="s">
                <EuiLink href={row.href} target="_blank" external color="primary">
                  {row.label}
                </EuiLink>
              </EuiText>
            </EuiFlexItem>
          </React.Fragment>
        ))}
      </EuiFlexGroup>
    );
  }
);

AttachmentsOverviewSection.displayName = 'AttachmentsOverviewSection';
