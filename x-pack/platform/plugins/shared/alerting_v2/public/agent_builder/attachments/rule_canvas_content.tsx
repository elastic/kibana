/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
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
import {
  ALL_CHANGES_SAVED_LABEL,
  isAttachmentSaved,
  runAttachmentSave,
  SAVING_LABEL,
  showsAttachmentPersistenceNotice,
  syncAttachmentOrigin,
} from './attachment_persistence';
import type { RuleAttachment } from './rule_attachment_definition';
import {
  getRuleRunStatus,
  RULE_OUT_OF_SYNC_MESSAGE,
  RulePersistenceNotice,
  useRulePersistence,
} from './rule_persistence';

export interface RuleCanvasContentProps
  extends AttachmentRenderProps<RuleAttachment>,
    CanvasRenderCallbacks {}

export const RuleCanvasContent = ({
  attachment,
  registerActionButtons,
  updateOrigin,
}: RuleCanvasContentProps) => {
  const rulesApi = useService(RulesApi);
  const share = useService(PluginStart('share')) as SharePluginStart;
  const notifications = useService(CoreStart('notifications'));
  const [queryClient] = React.useState(() => new QueryClient());
  const locators = useMemo(
    () => bindLocatorsToHost(getAlertingV2Locators(share), OBSERVABILITY_ALERTING_HOST),
    [share]
  );

  const { data } = attachment;
  const persistence = useRulePersistence(attachment);
  const { isPersisted, isSaving, outOfSync } = persistence;
  const isEnabled = data.enabled ?? true;
  const { label: status, color: statusColor } = getRuleRunStatus(!isPersisted, isEnabled);
  const showPersistenceNotice = showsAttachmentPersistenceNotice(persistence);
  const isSaved = isAttachmentSaved(persistence);
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
      registerActionButtons([
        {
          label: isSaving
            ? SAVING_LABEL
            : i18n.translate('xpack.alertingV2.ruleAttachment.createRule', {
                defaultMessage: 'Create rule',
              }),
          icon: 'save',
          type: ActionButtonType.PRIMARY,
          disabled: isSaving,
          handler: () =>
            runAttachmentSave(attachment.id, async () => {
              const savedRule = data.id
                ? await rulesApi.upsertRule(data.id, buildRulePayload(data))
                : await rulesApi.createRule(buildRulePayload(data));
              await syncAttachmentOrigin(attachment.id, savedRule.id, updateOrigin);
              notifications.toasts.addSuccess(
                i18n.translate('xpack.alertingV2.ruleAttachment.createdSuccess', {
                  defaultMessage: 'Rule "{name}" created',
                  values: { name: data.metadata.name },
                })
              );
            }),
        },
      ]);
      return;
    }

    const ruleId = attachment.origin;
    if (!ruleId) {
      return;
    }

    const getUpdateDisabledReason = (): string | undefined => {
      if (isSaving) {
        return undefined;
      }
      if (outOfSync) {
        return RULE_OUT_OF_SYNC_MESSAGE;
      }
      return isSaved ? ALL_CHANGES_SAVED_LABEL : undefined;
    };

    registerActionButtons([
      {
        label: isSaving
          ? SAVING_LABEL
          : i18n.translate('xpack.alertingV2.ruleAttachment.updateRule', {
              defaultMessage: 'Update Rule',
            }),
        icon: 'save',
        type: ActionButtonType.PRIMARY,
        disabled: isSaving || outOfSync || isSaved,
        disabledReason: getUpdateDisabledReason(),
        handler: () =>
          runAttachmentSave(attachment.id, async () => {
            await rulesApi.upsertRule(ruleId, buildRulePayload(data));
            // upsertRule writes the saved object only. Refreshing the origin records a new
            // origin_snapshot_at so this attachment version counts as synced.
            await syncAttachmentOrigin(attachment.id, ruleId, updateOrigin);
            notifications.toasts.addSuccess(
              i18n.translate('xpack.alertingV2.ruleAttachment.updatedSuccess', {
                defaultMessage: 'Rule "{name}" updated',
                values: { name: data.metadata.name },
              })
            );
          }),
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
    attachment.origin,
    registerActionButtons,
    updateOrigin,
    rulesApi,
    share,
    notifications,
    data,
    attachment.id,
    isSaving,
    outOfSync,
    isSaved,
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <LocatorProvider locators={locators}>
        <EuiPanel paddingSize="l" hasShadow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color={statusColor} data-test-subj="ruleCanvasStatus">
                {status}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          {showPersistenceNotice && (
            <>
              <EuiSpacer size="m" />
              <RulePersistenceNotice {...persistence} />
            </>
          )}
          <EuiSpacer size="m" />
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
