/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getAlertRow } from './types/alert';
import { getAttackRow } from './types/attack';
import { getEntityRow } from './types/entity';
import { getInvestigationIocDetailRows } from './types/investigation_ioc';
import { getInvestigationTimelineDetailRows } from './types/investigation_timeline';
import { getRuleRow } from './types/rule';
import { ATTACHMENTS_OVERVIEW_LABELS } from './translations';

export interface AttachmentsOverviewSectionProps {
  attachments: readonly VersionedAttachment[];
  /** Builds a Security app URL for the given path, including base path and space prefix. */
  getSecurityAppUrl: (path: string) => string;
  /**
   * Looks up an attachment type's UI definition so defined types can render
   * `renderConversationDetailsContent`.
   */
  getAttachmentUiDefinition?: AttachmentServiceStartContract['getAttachmentUiDefinition'];
}

/** Renders the "Attachments" subsection inside the investigation Overview tab. */
export const AttachmentsOverviewSection = memo<AttachmentsOverviewSectionProps>(
  ({ attachments, getSecurityAppUrl, getAttachmentUiDefinition }) => {
    const rows = useMemo(() => {
      const linkRows = [
        getAlertRow(attachments, getSecurityAppUrl),
        getAttackRow(attachments, getSecurityAppUrl),
        getEntityRow(attachments, getSecurityAppUrl),
        getRuleRow(attachments, getSecurityAppUrl),
      ]
        .filter((row): row is { label: string; href: string } => row !== undefined)
        .map((row) => ({
          key: row.href,
          content: (
            <EuiText size="s">
              <EuiLink href={row.href} target="_blank" external color="primary">
                {row.label}
              </EuiLink>
            </EuiText>
          ),
        }));

      const detailRows = (
        getAttachmentUiDefinition
          ? [
              getInvestigationTimelineDetailRows(attachments, getAttachmentUiDefinition),
              getInvestigationIocDetailRows(attachments, getAttachmentUiDefinition),
            ]
          : []
      ).filter((row): row is { key: string; content: ReactNode } => row != null);

      return [...linkRows, ...detailRows];
    }, [attachments, getAttachmentUiDefinition, getSecurityAppUrl]);

    if (rows.length === 0) return null;

    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{ATTACHMENTS_OVERVIEW_LABELS.sectionTitle}</h4>
          </EuiTitle>
        </EuiFlexItem>
        {rows.map((row, index) => (
          <React.Fragment key={row.key}>
            {index > 0 && <EuiHorizontalRule margin="none" />}
            <EuiFlexItem>{row.content}</EuiFlexItem>
          </React.Fragment>
        ))}
      </EuiFlexGroup>
    );
  }
);

AttachmentsOverviewSection.displayName = 'AttachmentsOverviewSection';
