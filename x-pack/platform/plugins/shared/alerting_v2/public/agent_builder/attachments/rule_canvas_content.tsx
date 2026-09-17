/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiPanel } from '@elastic/eui';
import {
  ActionButtonType,
  type AttachmentRenderProps,
  type CanvasRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { buildRulePayload } from '@kbn/alerting-v2-utils';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  RuleSummaryAboutSection,
  RuleSummaryActionPoliciesSection,
  RuleSummaryArtifactsSection,
  RuleSummaryBody,
  RuleSummaryInvestigationSection,
} from '../../components/rule/rule_summary';
import { getAlertingV2Locators } from '../../application/bind_locators_to_host';
import { LocatorProvider } from '../../application/locator_context';
import { paths } from '../../constants';
import { RulesApi } from '../../services/rules_api';
import type { RuleAttachment } from './rule_attachment_definition';
import { RuleQueryPreviewSection } from './rule_query_preview_section';

export interface RuleCanvasContentProps
  extends AttachmentRenderProps<RuleAttachment>,
    CanvasRenderCallbacks {}

export const RuleCanvasContent = ({
  attachment,
  registerActionButtons,
  updateOrigin,
}: RuleCanvasContentProps) => {
  const rulesApi = useService(RulesApi);
  const application = useService(CoreStart('application'));
  const basePath = useService(CoreStart('http')).basePath;
  const notifications = useService(CoreStart('notifications'));
  const share = useService<SharePluginStart>(PluginStart('share'));
  const locators = useMemo(() => getAlertingV2Locators(share), [share]);
  const [queryClient] = React.useState(() => new QueryClient());

  const { data, origin: savedObjectId } = attachment;
  const isPersisted = isPersistedSavedObject(savedObjectId);
  const summaryRule = useMemo(
    () => ({ ...data, id: isPersisted ? savedObjectId : undefined }),
    [data, isPersisted, savedObjectId]
  );

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
            const savedRule = data.id
              ? await rulesApi.upsertRule(data.id, buildRulePayload(data))
              : await rulesApi.createRule(buildRulePayload(data));
            await updateOrigin(savedRule.id);
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

    const ruleId = savedObjectId;

    registerActionButtons([
      {
        label: i18n.translate('xpack.alertingV2.ruleAttachment.updateRule', {
          defaultMessage: 'Update Rule',
        }),
        icon: 'save',
        type: ActionButtonType.PRIMARY,
        handler: async () => {
          await rulesApi.upsertRule(ruleId, buildRulePayload(data));
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
        icon: 'external',
        type: ActionButtonType.OVERFLOW,
        // TODO: Migrate to rules locator once agent builder attachments render inside the LocatorProvider tree
        handler: () => {
          application.navigateToUrl(basePath.prepend(paths.ruleDetails(ruleId)));
        },
      },
    ]);
  }, [
    mounted,
    isPersisted,
    savedObjectId,
    registerActionButtons,
    updateOrigin,
    rulesApi,
    application,
    basePath,
    notifications,
    data,
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <LocatorProvider locators={locators}>
        <EuiPanel paddingSize="l" hasShadow={false}>
          <RuleSummaryBody rule={summaryRule}>
            <RuleSummaryAboutSection />
            <RuleSummaryInvestigationSection />
            <RuleQueryPreviewSection />
            <RuleSummaryActionPoliciesSection />
            <RuleSummaryArtifactsSection />
          </RuleSummaryBody>
        </EuiPanel>
      </LocatorProvider>
    </QueryClientProvider>
  );
};

const isPersistedSavedObject = (savedObjectId: string | undefined): savedObjectId is string => {
  return Boolean(savedObjectId);
};
