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
import { getAlertRow } from './types/alert';
import { getAttackRow } from './types/attack';
import { getEntityRow } from './types/entity';
import { getRuleRow } from './types/rule';
import { ATTACHMENTS_OVERVIEW_LABELS } from './translations';

export interface AttachmentsOverviewSectionProps {
  attachments: readonly VersionedAttachment[];
  /** Builds a Security app URL for the given path, including base path and space prefix. */
  getSecurityAppUrl: (path: string) => string;
}

/** Renders the "Attachments" subsection inside the investigation Overview tab.
 *  Rows appear only for types that have at least one item and a resolvable URL. */
export const AttachmentsOverviewSection = memo<AttachmentsOverviewSectionProps>(
  ({ attachments, getSecurityAppUrl }) => {
    const rows = useMemo(
      () =>
        [
          getAlertRow(attachments, getSecurityAppUrl),
          getAttackRow(attachments, getSecurityAppUrl),
          getEntityRow(attachments, getSecurityAppUrl),
          getRuleRow(attachments, getSecurityAppUrl),
        ].filter((row): row is { label: string; href: string } => row !== undefined),
      [attachments, getSecurityAppUrl]
    );

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
