/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
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
import { Context } from '@kbn/core-di-browser';
import type { Container } from 'inversify';
import { RuleProvider } from '../../components/rule_details/rule_context';
import { RuleHeaderDescription } from '../../components/rule_details/rule_header_description';
import { RuleSidebar } from '../../components/rule_details/sidebar/rule_sidebar';
import { paths } from '../../constants';
import type { RuleApiResponse, RulesApi } from '../../services/rules_api';

type RuleAttachment = Attachment<typeof RULE_ATTACHMENT_TYPE, RuleAttachmentData>;

interface RuleAttachmentDefinitionServices {
  rulesApi: RulesApi;
  application: ApplicationStart;
  basePath: IBasePath;
  notifications: NotificationsStart;
  container: Container;
}

// ─── Canvas content ───────────────────────────────────────────────────────────

interface RuleCanvasContentProps
  extends AttachmentRenderProps<RuleAttachment>,
    CanvasRenderCallbacks {
  rulesApi: RulesApi;
  application: ApplicationStart;
  basePath: IBasePath;
  notifications: NotificationsStart;
  container: Container;
}


const RuleCanvasContent = ({
  attachment,
  registerActionButtons,
  updateOrigin,
  rulesApi,
  application,
  basePath,
  notifications,
  container,
}: RuleCanvasContentProps) => {
  const { data, origin } = attachment;
  const isSaved = Boolean(origin);

  // Mirrors the dashboard pattern: start false so the first effect registers [],
  // matching the canvas_flyout clear effect. The second cycle (mounted=true)
  // registers the real buttons after the parent clear has already fired.
  const [mounted, setMounted] = React.useState(false);

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
          await rulesApi.updateRule(ruleId, {
            metadata: data.metadata,
            schedule: data.schedule,
            evaluation: { query: data.evaluation?.query },
            state_transition: data.state_transition ?? null,
            ...(data.recovery_policy !== undefined ? { recovery_policy: data.recovery_policy } : {}),
            ...(data.grouping !== undefined ? { grouping: data.grouping } : {}),
            ...(data.no_data !== undefined ? { no_data: data.no_data } : {}),
            ...(data.artifacts !== undefined ? { artifacts: data.artifacts } : {}),
          });
          notifications.toasts.addSuccess(`Rule "${data.metadata.name}" updated`);
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
    ]);
  }, [
    mounted,
    isSaved,
    origin,
    registerActionButtons,
    updateOrigin,
    rulesApi,
    application,
    basePath,
    notifications,
    data,
  ]);

  return (
    <Context.Provider value={container}>
      <RuleProvider rule={data as unknown as RuleApiResponse}>
        <EuiPanel paddingSize="l" hasShadow={false}>
          <RuleHeaderDescription />
          <EuiSpacer size="m" />
          <RuleSidebar />
        </EuiPanel>
      </RuleProvider>
    </Context.Provider>
  );
};

// ─── Definition ───────────────────────────────────────────────────────────────

export const createRuleAttachmentDefinition = ({
  rulesApi,
  application,
  basePath,
  notifications,
  container,
}: RuleAttachmentDefinitionServices): AttachmentUIDefinition<RuleAttachment> => ({
  getLabel: (attachment) => attachment.data.metadata.name,
  getIcon: () => 'bell',

  canvasWidth: '40vw',

  renderInlineContent: ({ attachment }) => {
    const { data, origin } = attachment;
    const isProposed = !origin;
    const status = isProposed ? 'proposed' : (data.enabled ?? true) ? 'enabled' : 'disabled';
    const statusColor = isProposed ? 'default' : (data.enabled ?? true) ? 'success' : 'warning';

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
      container={container}
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
