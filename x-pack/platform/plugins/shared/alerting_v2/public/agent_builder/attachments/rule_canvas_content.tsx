/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import {
  ActionButtonType,
  type AttachmentRenderProps,
  type CanvasRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import type { ApplicationStart, IBasePath, NotificationsStart } from '@kbn/core/public';
import { Context } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { Container } from 'inversify';
import { RuleProvider } from '../../components/rule_details/rule_context';
import { RuleHeaderDescription } from '../../components/rule_details/rule_header_description';
import { RuleSidebar } from '../../components/rule_details/sidebar/rule_sidebar';
import { paths } from '../../constants';
import type { RuleApiResponse, RulesApi } from '../../services/rules_api';
import type { RuleAttachment } from './rule_attachment_definition';

export interface RuleCanvasContentProps
  extends AttachmentRenderProps<RuleAttachment>,
    CanvasRenderCallbacks {
  rulesApi: RulesApi;
  application: ApplicationStart;
  basePath: IBasePath;
  notifications: NotificationsStart;
  container: Container;
}

export const RuleCanvasContent = ({
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
  const isPersisted = hasOrigin(origin);

  // Start false so the first effect registers [],
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

    if (!isPersisted) {
      registerActionButtons([
        {
          label: i18n.translate('xpack.alertingV2.ruleAttachment.createRule', {
            defaultMessage: 'Create rule',
          }),
          icon: 'save',
          type: ActionButtonType.PRIMARY,
          handler: async () => {
            const created = await rulesApi.createRule({
              kind: data.kind,
              ...buildRuleCommonPayload(data),
            });
            await updateOrigin(created.id);
            notifications.toasts.addSuccess(
              i18n.translate('xpack.alertingV2.ruleAttachment.createdSuccess', {
                defaultMessage: 'Rule "{name}" created',
                values: { name: data.metadata.name },
              })
            );
          },
        },
      ]);
      return;
    }

    const ruleId = origin;

    registerActionButtons([
      {
        label: i18n.translate('xpack.alertingV2.ruleAttachment.updateRule', {
          defaultMessage: 'Update Rule',
        }),
        icon: 'save',
        type: ActionButtonType.PRIMARY,
        handler: async () => {
          await rulesApi.updateRule(ruleId, {
            ...buildRuleCommonPayload(data),
          });
          notifications.toasts.addSuccess(
            i18n.translate('xpack.alertingV2.ruleAttachment.updatedSuccess', {
              defaultMessage: 'Rule "{name}" updated',
              values: { name: data.metadata.name },
            })
          );
        },
      },
      {
        label: i18n.translate('xpack.alertingV2.ruleAttachment.viewInRules', {
          defaultMessage: 'View in Rules',
        }),
        icon: 'popout',
        type: ActionButtonType.OVERFLOW,
        handler: () => {
          application.navigateToUrl(basePath.prepend(paths.ruleDetails(ruleId)));
        },
      },
    ]);
  }, [
    mounted,
    isPersisted,
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

const hasOrigin = (origin: string | undefined): origin is string => {
  return typeof origin === 'string';
};

const buildRuleCommonPayload = (data: RuleAttachment['data']) => ({
  metadata: data.metadata,
  schedule: data.schedule,
  evaluation: data.evaluation,
  state_transition: data.state_transition ?? null,
  time_field: data.time_field ?? '@timestamp',
  ...(data.recovery_policy !== undefined ? { recovery_policy: data.recovery_policy } : {}),
  ...(data.grouping !== undefined ? { grouping: data.grouping } : {}),
  ...(data.no_data !== undefined ? { no_data: data.no_data } : {}),
  ...(data.artifacts !== undefined ? { artifacts: data.artifacts } : {}),
});
