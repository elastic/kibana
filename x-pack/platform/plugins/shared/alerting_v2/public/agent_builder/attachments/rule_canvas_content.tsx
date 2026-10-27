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
import { PluginStart } from '@kbn/core-di';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import { buildRulePayload } from '@kbn/alerting-v2-utils';
import { bindLocatorsToHost, getAlertingV2Locators } from '../../application/bind_locators_to_host';
import { LocatorProvider } from '../../application/locator_context';
import {
  RuleSummaryAboutSection,
  RuleSummaryArtifactsSection,
  RuleSummaryBody,
  RuleSummaryInvestigationSection,
} from '../../components/rule/rule_summary';
import { RuleSummaryQueryPreviewSection } from '../../components/rule/rule_summary/rule_summary_query_preview_section';
import { OBSERVABILITY_ALERTING_HOST } from '../../../common/locators';
import { RulesApi } from '../../services/rules_api';
import { RuleTemplatesApi } from '../../services/rule_templates_api';
import type { RuleAttachment } from './rule_attachment_definition';

export interface RuleCanvasContentProps
  extends AttachmentRenderProps<RuleAttachment>,
    CanvasRenderCallbacks {}

export const RuleCanvasContent = ({
  attachment,
  registerActionButtons,
  updateOrigin,
}: RuleCanvasContentProps) => {
  const rulesApi = useService(RulesApi);
  const ruleTemplatesApi = useService(RuleTemplatesApi);
  const share = useService(PluginStart('share')) as SharePluginStart;
  const notifications = useService(CoreStart('notifications'));
  const [queryClient] = React.useState(() => new QueryClient());
  const locators = useMemo(
    () => bindLocatorsToHost(getAlertingV2Locators(share), OBSERVABILITY_ALERTING_HOST),
    [share]
  );

  const { data, origin: savedObjectId } = attachment;
  const isPersisted = isPersistedSavedObject(savedObjectId);
  const summaryRule = useMemo(() => ({ ...data, id: undefined }), [data]);

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
      const { id, template_id: templateId } = data;
      const saveNewRule = (payload: CreateRuleData) => {
        if (templateId) {
          return id
            ? ruleTemplatesApi.upsertInstallRuleTemplate(templateId, id, payload)
            : ruleTemplatesApi.installRuleTemplate(templateId, payload);
        }
        return id ? rulesApi.upsertRule(id, payload) : rulesApi.createRule(payload);
      };

      registerActionButtons([
        {
          label: i18n.translate('xpack.alertingV2.ruleAttachment.createRule', {
            defaultMessage: 'Create rule',
          }),
          icon: 'save',
          type: ActionButtonType.PRIMARY,
          handler: async () => {
            const payload = buildRulePayload(data);
            const savedRule = await saveNewRule(payload);
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
        handler: () => {
          getAlertingV2Locators(share).rulesLocators.navigateSync({
            ruleId,
            host: OBSERVABILITY_ALERTING_HOST.rules,
          });
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
    ruleTemplatesApi,
    share,
    notifications,
    data,
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <LocatorProvider locators={locators}>
        <EuiPanel paddingSize="l" hasShadow={false}>
          <RuleSummaryBody rule={summaryRule}>
            <RuleSummaryAboutSection />
            <RuleSummaryQueryPreviewSection />
            <RuleSummaryInvestigationSection />
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
