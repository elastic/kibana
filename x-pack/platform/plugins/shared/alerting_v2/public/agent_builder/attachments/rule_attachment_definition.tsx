/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { type RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import type { ApplicationStart, IBasePath } from '@kbn/core/public';
import { paths } from '../../constants';
import type { RulesApi } from '../../services/rules_api';

type RuleAttachment = Attachment<typeof RULE_ATTACHMENT_TYPE, RuleAttachmentData>;

interface RuleAttachmentDefinitionServices {
  rulesApi: RulesApi;
  application: ApplicationStart;
  basePath: IBasePath;
}

export const createRuleAttachmentDefinition = ({
  rulesApi,
  application,
  basePath,
}: RuleAttachmentDefinitionServices): AttachmentUIDefinition<RuleAttachment> => ({
  getLabel: (attachment) => attachment.data.metadata.name,
  getIcon: () => 'bell',

  renderInlineContent: ({ attachment }) => {
    const { data } = attachment;
    const isProposed = !data.id;
    const status = isProposed ? 'proposed' : data.enabled ? 'enabled' : 'disabled';
    const statusColor = isProposed ? 'default' : data.enabled ? 'success' : 'warning';

    return (
      <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h4>{data.metadata.name}</h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color={statusColor}>{status}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{data.kind}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          {data.schedule?.every && (
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                Every {data.schedule.every}
              </EuiText>
            </EuiFlexItem>
          )}

          {data.metadata.description && (
            <EuiFlexItem>
              <EuiText size="s">{data.metadata.description}</EuiText>
            </EuiFlexItem>
          )}

          {data.metadata.tags && data.metadata.tags.length > 0 && (
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="xs" wrap>
                {data.metadata.tags.map((tag) => (
                  <EuiFlexItem key={tag} grow={false}>
                    <EuiBadge color="default">{tag}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    );
  },

  getActionButtons: ({ attachment, updateOrigin }) => {
    const { data, origin } = attachment;
    const isSaved = Boolean(origin);

    if (!isSaved) {
      return [
        {
          label: 'Save as Rule',
          icon: 'save',
          type: ActionButtonType.PRIMARY,
          handler: async () => {
            const created = await rulesApi.createRule({
              kind: data.kind,
              metadata: data.metadata,
              time_field: data.time_field ?? '@timestamp',
              schedule: data.schedule,
              evaluation: data.evaluation,
              state_transition: data.state_transition ?? null,
              ...(data.recovery_policy ? { recovery_policy: data.recovery_policy } : {}),
              ...(data.grouping ? { grouping: data.grouping } : {}),
              ...(data.no_data ? { no_data: data.no_data } : {}),
              ...(data.artifacts ? { artifacts: data.artifacts } : {}),
            });
            await updateOrigin(created.id);
          },
        },
      ];
    }

    const ruleId = origin!;
    const isEnabled = data.enabled ?? false;

    return [
      {
        label: 'Update Rule',
        icon: 'save',
        type: ActionButtonType.PRIMARY,
        handler: async () => {
          await rulesApi.updateRule(ruleId, {
            metadata: data.metadata,
            schedule: data.schedule,
            evaluation: { query: data.evaluation?.query },
            state_transition: data.state_transition ?? null,
            ...(data.recovery_policy !== undefined
              ? { recovery_policy: data.recovery_policy }
              : {}),
            ...(data.grouping !== undefined ? { grouping: data.grouping } : {}),
            ...(data.no_data !== undefined ? { no_data: data.no_data } : {}),
            ...(data.artifacts !== undefined ? { artifacts: data.artifacts } : {}),
          });
        },
      },
      {
        label: isEnabled ? 'Disable' : 'Enable',
        icon: isEnabled ? 'pause' : 'play',
        type: ActionButtonType.SECONDARY,
        handler: async () => {
          if (isEnabled) {
            await rulesApi.bulkDisableRules({ ids: [ruleId] });
          } else {
            await rulesApi.bulkEnableRules({ ids: [ruleId] });
          }
        },
      },
      {
        label: 'View in Rules',
        icon: 'popout',
        type: ActionButtonType.OVERFLOW,
        handler: () => {
          application.navigateToUrl(basePath.prepend(paths.ruleDetails(ruleId)));
        },
      },
      {
        label: 'Delete Rule',
        icon: 'trash',
        type: ActionButtonType.OVERFLOW,
        handler: async () => {
          await rulesApi.deleteRule(ruleId);
        },
      },
    ];
  },
});
