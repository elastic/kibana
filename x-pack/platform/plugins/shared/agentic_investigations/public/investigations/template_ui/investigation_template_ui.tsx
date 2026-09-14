/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  ConversationTemplateServiceStartContract,
  ConversationTemplateDetailsFlyoutRenderProps,
} from '@kbn/agent-builder-browser';
import { INVESTIGATION_ATTACHMENT_IDS } from '../../../common/investigations/constants';

const INVESTIGATION_TEMPLATE_ID = 'investigation';
const INVESTIGATION_IMPACT_TAB_ID = 'investigations.impact_tab';

/** Maps investigation severity to an EUI badge color. */
const severityBadgeColor = (severity: string | undefined): string => {
  switch (severity) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'primary';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
};

/** Maps investigation status to an EUI badge color. */
const statusBadgeColor = (status: string | undefined): string => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'running':
      return 'primary';
    case 'failed':
      return 'danger';
    case 'cancelled':
      return 'default';
    default:
      return 'default';
  }
};

const InvestigationDetailsHeader = ({
  conversation,
}: ConversationTemplateDetailsFlyoutRenderProps) => {
  const metadata = conversation.metadata ?? {};
  const severity =
    typeof metadata['investigation.severity'] === 'string'
      ? metadata['investigation.severity']
      : undefined;
  const status =
    typeof metadata['investigation.status'] === 'string'
      ? metadata['investigation.status']
      : undefined;
  const summary =
    typeof metadata['investigation.summary'] === 'string'
      ? metadata['investigation.summary']
      : undefined;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h2>
            {conversation.title ||
              i18n.translate('xpack.agenticInvestigations.templateUI.header.defaultTitle', {
                defaultMessage: 'Investigation',
              })}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          {severity && (
            <EuiFlexItem grow={false}>
              <EuiBadge color={severityBadgeColor(severity)}>
                {i18n.translate('xpack.agenticInvestigations.templateUI.header.severityBadge', {
                  defaultMessage: '{severity}',
                  values: {
                    severity: severity.charAt(0).toUpperCase() + severity.slice(1),
                  },
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
          {status && (
            <EuiFlexItem grow={false}>
              <EuiBadge color={statusBadgeColor(status)}>
                {i18n.translate('xpack.agenticInvestigations.templateUI.header.statusBadge', {
                  defaultMessage: '{status}',
                  values: {
                    status: status.charAt(0).toUpperCase() + status.slice(1),
                  },
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {summary && (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <p>{summary}</p>
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const ImpactTabContent = ({ conversation }: ConversationTemplateDetailsFlyoutRenderProps) => {
  const impactAttachment = conversation.attachments?.find(
    (att) => att.type === INVESTIGATION_ATTACHMENT_IDS.IMPACT
  );

  if (!impactAttachment) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.agenticInvestigations.templateUI.impactTab.noData', {
          defaultMessage: 'No impact data available for this investigation.',
        })}
      </EuiText>
    );
  }

  const currentVersionData = impactAttachment.versions.find(
    (v) => v.version === impactAttachment.current_version
  )?.data as { entities?: Array<{ name: string; type?: string }> } | undefined;

  const entities = currentVersionData?.entities ?? [];

  if (!entities.length) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.agenticInvestigations.templateUI.impactTab.noEntities', {
          defaultMessage: 'No impacted entities identified.',
        })}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {entities.map((entity) => (
        <EuiFlexItem key={entity.name} grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{entity.name}</EuiBadge>
            </EuiFlexItem>
            {entity.type && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {entity.type}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

/** Registers the investigation conversation template and its associated tabs. */
export const registerInvestigationTemplateUI = (
  conversationTemplates: ConversationTemplateServiceStartContract
): void => {
  conversationTemplates.registerTab(INVESTIGATION_IMPACT_TAB_ID, () => ({
    label: i18n.translate('xpack.agenticInvestigations.templateUI.impactTab.label', {
      defaultMessage: 'Impact',
    }),
    content: ImpactTabContent,
  }));

  conversationTemplates.registerTemplateUIDefinition(INVESTIGATION_TEMPLATE_ID, () => ({
    name: i18n.translate('xpack.agenticInvestigations.templateUI.templateName', {
      defaultMessage: 'Investigation',
    }),
    icon: 'inspect',
    tabs: [INVESTIGATION_IMPACT_TAB_ID],
    detailsFlyout: {
      header: InvestigationDetailsHeader,
    },
  }));
};
