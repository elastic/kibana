/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import {
  ActionButtonType,
  type AttachmentRenderProps,
  type CanvasRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { WorkflowApi } from '@kbn/workflows-ui';
import { attachmentDataToActionPolicyPayload } from '@kbn/alerting-v2-utils';
import { getAlertingV2Locators } from '../../application/bind_locators_to_host';
import { ActionPolicyDefinitionList } from '../../components/action_policy/details_flyout/action_policy_definition_list';
import { ActionPoliciesApi } from '../../services/action_policies_api';
import { OBSERVABILITY_ALERTING_HOST } from '../../../common/locators';
import {
  ALL_CHANGES_SAVED_LABEL,
  isAttachmentSaved,
  runAttachmentSave,
  SAVING_LABEL,
  showsAttachmentPersistenceNotice,
  syncAttachmentOrigin,
} from './attachment_persistence';
import type { ActionPolicyAttachment } from './action_policy_attachment_definition';
import {
  ACTION_POLICY_OUT_OF_SYNC_MESSAGE,
  ActionPolicyPersistenceNotice,
  getActionPolicyRunStatus,
  useActionPolicyPersistence,
} from './action_policy_persistence';

const EMPTY_VALUE = '-';

type ActionPolicyCanvasData = ActionPolicyAttachment['data'] & { id: string; name: string };

export interface ActionPolicyCanvasContentProps
  extends AttachmentRenderProps<ActionPolicyAttachment>,
    CanvasRenderCallbacks {}

export const ActionPolicyCanvasContent = ({
  attachment,
  registerActionButtons,
  updateOrigin,
}: ActionPolicyCanvasContentProps) => {
  const actionPoliciesApi = useService(ActionPoliciesApi);
  const workflowApi = useService(WorkflowApi);
  const share = useService(PluginStart('share')) as SharePluginStart;
  const notifications = useService(CoreStart('notifications'));

  const { data: rawData } = attachment;
  const data = rawData as ActionPolicyCanvasData;
  const persistence = useActionPolicyPersistence(attachment);
  const { isPersisted, isSaving, outOfSync } = persistence;
  const isSaved = isAttachmentSaved(persistence);
  const isEnabled = data.enabled ?? true;
  const { label: status, color: statusColor } = getActionPolicyRunStatus(!isPersisted, isEnabled);

  const [mounted, setMounted] = useState(false);
  const [dependenciesReady, setDependenciesReady] = useState<boolean | null>(null);

  useEffect(() => {
    const checks: Array<Promise<{ workflow?: boolean }>> = [];
    const abortController = new AbortController();

    const workflowDestinations = (data.destinations ?? []).filter((d) => d.type === 'workflow');
    for (const dest of workflowDestinations) {
      checks.push(
        workflowApi
          .getWorkflow(dest.id)
          .then(() => ({ workflow: true }))
          .catch(() => ({ workflow: false }))
      );
    }

    if (checks.length === 0) {
      setDependenciesReady(true);
      return;
    }

    setDependenciesReady(null);

    Promise.all(checks).then((results) => {
      if (!abortController.signal.aborted) {
        setDependenciesReady(results.every((result) => result.workflow));
      }
    });

    return () => {
      abortController.abort();
    };
  }, [workflowApi, data.destinations]);

  const hasDraftDependencies = dependenciesReady !== true;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      registerActionButtons([]);
      return;
    }

    const saveWorkflowFirst = hasDraftDependencies
      ? i18n.translate('xpack.alertingV2.actionPolicyAttachment.saveWorkflowFirst', {
          defaultMessage: 'Save workflow before saving policy.',
        })
      : undefined;

    if (!isPersisted) {
      registerActionButtons([
        {
          label: isSaving
            ? SAVING_LABEL
            : i18n.translate('xpack.alertingV2.actionPolicyAttachment.createPolicy', {
                defaultMessage: 'Create policy',
              }),
          icon: 'save',
          type: ActionButtonType.PRIMARY,
          disabled: isSaving || hasDraftDependencies,
          disabledReason: isSaving ? undefined : saveWorkflowFirst,
          handler: () =>
            runAttachmentSave(attachment.id, async () => {
              try {
                await actionPoliciesApi.upsertActionPolicy(
                  data.id,
                  attachmentDataToActionPolicyPayload(data)
                );
                await syncAttachmentOrigin(attachment.id, data.id, updateOrigin);
                notifications.toasts.addSuccess(
                  i18n.translate('xpack.alertingV2.actionPolicyAttachment.createdSuccess', {
                    defaultMessage: 'Policy "{name}" created',
                    values: { name: data.name },
                  })
                );
              } catch (e) {
                notifications.toasts.addDanger(
                  i18n.translate('xpack.alertingV2.actionPolicyAttachment.createError', {
                    defaultMessage: 'Failed to create policy: {error}',
                    values: { error: e.body?.message ?? e.message },
                  })
                );
              }
            }),
        },
      ]);
      return;
    }

    const getUpdateDisabledReason = (): string | undefined => {
      if (isSaving) {
        return undefined;
      }
      if (outOfSync) {
        return ACTION_POLICY_OUT_OF_SYNC_MESSAGE;
      }
      return isSaved ? ALL_CHANGES_SAVED_LABEL : saveWorkflowFirst;
    };

    registerActionButtons([
      {
        label: isSaving
          ? SAVING_LABEL
          : i18n.translate('xpack.alertingV2.actionPolicyAttachment.updatePolicy', {
              defaultMessage: 'Update Policy',
            }),
        icon: 'save',
        type: ActionButtonType.PRIMARY,
        disabled: isSaving || outOfSync || isSaved || hasDraftDependencies,
        disabledReason: getUpdateDisabledReason(),
        handler: () =>
          runAttachmentSave(attachment.id, async () => {
            try {
              await actionPoliciesApi.upsertActionPolicy(
                data.id,
                attachmentDataToActionPolicyPayload(data)
              );
              // upsertActionPolicy writes the saved object only. Refreshing the origin records a
              // new origin_snapshot_at so this attachment version counts as synced.
              await syncAttachmentOrigin(attachment.id, data.id, updateOrigin);
              notifications.toasts.addSuccess(
                i18n.translate('xpack.alertingV2.actionPolicyAttachment.updatedSuccess', {
                  defaultMessage: 'Policy "{name}" updated',
                  values: { name: data.name },
                })
              );
            } catch (e) {
              notifications.toasts.addDanger(
                i18n.translate('xpack.alertingV2.actionPolicyAttachment.updateError', {
                  defaultMessage: 'Failed to update policy: {error}',
                  values: { error: e.body?.message ?? e.message },
                })
              );
            }
          }),
      },
      {
        label: i18n.translate('xpack.alertingV2.actionPolicyAttachment.viewInPolicies', {
          defaultMessage: 'View in Policies',
        }),
        icon: 'external',
        type: ActionButtonType.OVERFLOW,
        handler: () => {
          getAlertingV2Locators(share).actionPolicyLocators.navigateSync({
            page: 'edit',
            actionPolicyId: data.id,
            host: OBSERVABILITY_ALERTING_HOST.actionPolicies,
          });
        },
      },
    ]);
  }, [
    mounted,
    isPersisted,
    registerActionButtons,
    updateOrigin,
    actionPoliciesApi,
    share,
    notifications,
    data,
    hasDraftDependencies,
    attachment.id,
    isSaving,
    outOfSync,
    isSaved,
  ]);

  return (
    <EuiPanel paddingSize="l" hasShadow={false}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color={statusColor} data-test-subj="actionPolicyCanvasStatus">
            {status}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      {showsAttachmentPersistenceNotice(persistence) && (
        <>
          <EuiSpacer size="m" />
          <ActionPolicyPersistenceNotice {...persistence} />
        </>
      )}
      <EuiSpacer size="m" />
      <EuiTitle size="s">
        <h2>{data.name ?? EMPTY_VALUE}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <ActionPolicyDefinitionList policy={data} />
    </EuiPanel>
  );
};
