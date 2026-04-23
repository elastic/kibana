/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  ActionButtonType,
  type AttachmentRenderProps,
  type AttachmentUIDefinition,
  type CanvasRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { type RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import type { ApplicationStart, IBasePath, NotificationsStart } from '@kbn/core/public';
import { paths } from '../../constants';
import type { RulesApi } from '../../services/rules_api';

type RuleAttachment = Attachment<typeof RULE_ATTACHMENT_TYPE, RuleAttachmentData>;

interface RuleAttachmentDefinitionServices {
  rulesApi: RulesApi;
  application: ApplicationStart;
  basePath: IBasePath;
  notifications: NotificationsStart;
}

// ─── Canvas content ───────────────────────────────────────────────────────────

interface RuleCanvasContentProps
  extends AttachmentRenderProps<RuleAttachment>,
    CanvasRenderCallbacks {
  rulesApi: RulesApi;
  application: ApplicationStart;
  basePath: IBasePath;
  notifications: NotificationsStart;
}


const RuleCanvasContent = ({
  attachment,
  registerActionButtons,
  updateOrigin,
  refreshAttachment,
  rulesApi,
  application,
  basePath,
  notifications,
}: RuleCanvasContentProps) => {
  const { data, origin } = attachment;
  const isSaved = Boolean(origin);
  const isProposed = !isSaved;
  const status = isProposed ? 'proposed' : data.enabled ? 'enabled' : 'disabled';
  const statusColor = isProposed ? 'default' : data.enabled ? 'success' : 'warning';

  // Mirrors the dashboard pattern: start false so the first effect registers [],
  // matching the canvas_flyout clear effect. The second cycle (mounted=true)
  // registers the real buttons after the parent clear has already fired.
  const [mounted, setMounted] = useState(false);
  const [isEnabled, setIsEnabled] = useState(data.enabled ?? false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      registerActionButtons([]);
      return;
    }

    if (!isSaved) {
      registerActionButtons([
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
            notifications.toasts.addSuccess(`Rule "${data.metadata.name}" saved`);
          },
        },
      ]);
      return;
    }

    const ruleId = origin!;

    registerActionButtons([
      {
        label: 'Update Rule',
        icon: 'save',
        type: ActionButtonType.PRIMARY,
        handler: async () => {
          const updated = await rulesApi.updateRule(ruleId, {
            metadata: data.metadata,
            schedule: data.schedule,
            evaluation: { query: data.evaluation?.query },
            state_transition: data.state_transition ?? null,
            ...(data.recovery_policy !== undefined ? { recovery_policy: data.recovery_policy } : {}),
            ...(data.grouping !== undefined ? { grouping: data.grouping } : {}),
            ...(data.no_data !== undefined ? { no_data: data.no_data } : {}),
            ...(data.artifacts !== undefined ? { artifacts: data.artifacts } : {}),
          });
          await refreshAttachment(updated);
          notifications.toasts.addSuccess(`Rule "${data.metadata.name}" updated`);
        },
      },
      {
        label: isEnabled ? 'Disable' : 'Enable',
        icon: isEnabled ? 'pause' : 'play',
        type: ActionButtonType.SECONDARY,
        handler: async () => {
          if (isEnabled) {
            await rulesApi.bulkDisableRules({ ids: [ruleId] });
            setIsEnabled(false);
            const latest = await rulesApi.getRule(ruleId);
            await refreshAttachment(latest);
            notifications.toasts.addSuccess(`Rule "${data.metadata.name}" disabled`);
          } else {
            await rulesApi.bulkEnableRules({ ids: [ruleId] });
            setIsEnabled(true);
            const latest = await rulesApi.getRule(ruleId);
            await refreshAttachment(latest);
            notifications.toasts.addSuccess(`Rule "${data.metadata.name}" enabled`);
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
    ]);
  }, [
    mounted,
    isSaved,
    origin,
    isEnabled,
    registerActionButtons,
    updateOrigin,
    refreshAttachment,
    rulesApi,
    application,
    basePath,
    notifications,
    data,
  ]);

  return (
    <EuiPanel paddingSize="l" hasShadow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2>{data.metadata.name}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={statusColor}>{status}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{data.kind}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      {data.metadata.description && (
        <>
          <EuiSpacer size="s" />
          <EuiText color="subdued">{data.metadata.description}</EuiText>
        </>
      )}

      {data.metadata.tags && data.metadata.tags.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" wrap>
            {data.metadata.tags.map((tag) => (
              <EuiFlexItem key={tag} grow={false}>
                <EuiBadge color="default">{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}

      <EuiHorizontalRule />

      {data.schedule?.every && (
        <>
          <EuiText size="s">
            <strong>Schedule</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">
            Every {data.schedule.every}
            {data.schedule.lookback ? `, lookback ${data.schedule.lookback}` : ''}
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}

      {data.evaluation?.query?.base && (
        <>
          <EuiText size="s">
            <strong>ES|QL Query</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiCode language="sql">{data.evaluation.query.base}</EuiCode>
          <EuiSpacer size="m" />
        </>
      )}

      {data.grouping?.fields && data.grouping.fields.length > 0 && (
        <>
          <EuiText size="s">
            <strong>Group by</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">{data.grouping.fields.join(', ')}</EuiText>
          <EuiSpacer size="m" />
        </>
      )}

      {data.state_transition && (
        <>
          <EuiText size="s">
            <strong>State transition</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">
            {data.state_transition.pending_count !== undefined && (
              <>Pending after {data.state_transition.pending_count} breaches</>
            )}
            {data.state_transition.pending_timeframe && (
              <> within {data.state_transition.pending_timeframe}</>
            )}
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}

      {data.recovery_policy && (
        <>
          <EuiText size="s">
            <strong>Recovery</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">{data.recovery_policy.type}</EuiText>
          {data.recovery_policy.type === 'query' && data.recovery_policy.query?.base && (
            <>
              <EuiSpacer size="xs" />
              <EuiCode language="sql">{data.recovery_policy.query.base}</EuiCode>
            </>
          )}
        </>
      )}
    </EuiPanel>
  );
};

// ─── Definition ───────────────────────────────────────────────────────────────

export const createRuleAttachmentDefinition = ({
  rulesApi,
  application,
  basePath,
  notifications,
}: RuleAttachmentDefinitionServices): AttachmentUIDefinition<RuleAttachment> => ({
  getLabel: (attachment) => attachment.data.metadata.name,
  getIcon: () => 'bell',

  canvasWidth: '40vw',

  renderInlineContent: ({ attachment }) => {
    const { data, origin } = attachment;
    const isProposed = !origin;
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
                {data.metadata.tags.map((tag: string) => (
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

  renderCanvasContent: (props, callbacks) => (
    <RuleCanvasContent
      {...props}
      {...callbacks}
      rulesApi={rulesApi}
      application={application}
      basePath={basePath}
      notifications={notifications}
    />
  ),

  // Inline: only Preview opens the canvas. All action buttons live in the canvas header
  // (registered via registerActionButtons in RuleCanvasContent, same as dashboard pattern).
  getActionButtons: ({ openCanvas, isCanvas }) => {
    if (isCanvas) return [];
    return [
      {
        label: 'Preview',
        icon: 'eye',
        type: ActionButtonType.SECONDARY,
        handler: () => openCanvas?.(),
      },
    ];
  },
});
