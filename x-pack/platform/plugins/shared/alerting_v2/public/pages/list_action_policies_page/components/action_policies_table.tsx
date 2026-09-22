/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { ActionPolicyResponse, CreateActionPolicyData } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { ContentList, ContentListProvider } from '@kbn/content-list';
import type { FieldDefinition } from '@kbn/content-list-provider';
import { TAG_FILTER_ID } from '@kbn/content-list-provider';
import { DeleteActionPolicyConfirmModal } from '../../../components/action_policy/delete_confirmation_modal';
import { paths } from '../../../constants';
import { useBulkActionActionPolicies } from '../../../hooks/use_bulk_action_action_policies';
import { useCreateActionPolicy } from '../../../hooks/use_create_action_policy';
import { useDeleteActionPolicy } from '../../../hooks/use_delete_action_policy';
import { useDisableActionPolicy } from '../../../hooks/use_disable_action_policy';
import { useEnableActionPolicy } from '../../../hooks/use_enable_action_policy';
import { useSnoozeActionPolicy } from '../../../hooks/use_snooze_action_policy';
import { useUnsnoozeActionPolicy } from '../../../hooks/use_unsnooze_action_policy';
import { useUpdateActionPolicyApiKey } from '../../../hooks/use_update_action_policy_api_key';
import { UserCapabilities } from '../../../services/user_capabilities';
import { UpdateApiKeyConfirmationModal } from './update_api_key_confirmation_modal';
import { ENABLED_FILTER_ID, useActionPoliciesDataSource } from '../action_policies_data_source';
import {
  ActionPoliciesTableContent,
  ENABLED_FILTER_OPTIONS,
} from './action_policies_table_content';

const enabledFieldDefinition: FieldDefinition = {
  fieldName: ENABLED_FILTER_ID,
  resolveIdToDisplay: (id) => ENABLED_FILTER_OPTIONS.find((o) => o.key === id)?.label ?? id,
  resolveDisplayToId: (displayValue) =>
    ENABLED_FILTER_OPTIONS.find((o) => o.label === displayValue)?.key,
  resolveFuzzyDisplayToIds: (partial) => {
    const lower = partial.toLowerCase();
    return ENABLED_FILTER_OPTIONS.filter((o) => o.label.toLowerCase().includes(lower)).map(
      (o) => o.key
    );
  },
};

const tagFieldDefinition: FieldDefinition = {
  fieldName: TAG_FILTER_ID,
  resolveIdToDisplay: (id) => id,
  resolveDisplayToId: (displayValue) => displayValue,
};

const FEATURES_FIELDS: FieldDefinition[] = [enabledFieldDefinition, tagFieldDefinition];

export const ActionPoliciesTable = () => {
  const refetchRef = useRef<() => void>(() => {});
  const onRefetchReady = useCallback((refetchFn: () => void) => {
    refetchRef.current = refetchFn;
  }, []);

  const [policyToDelete, setPolicyToDelete] = useState<ActionPolicyResponse | null>(null);
  const [policyToUpdateApiKey, setPolicyToUpdateApiKey] = useState<string | null>(null);

  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));
  const canWrite = useService(UserCapabilities).canWrite('actionPolicies');

  const { mutate: createActionPolicy } = useCreateActionPolicy();
  const { mutate: deleteActionPolicy, isLoading: isDeleting } = useDeleteActionPolicy();
  const {
    mutate: enablePolicyMutate,
    isLoading: isEnabling,
    variables: enableVariables,
  } = useEnableActionPolicy();
  const {
    mutate: disablePolicyMutate,
    isLoading: isDisabling,
    variables: disableVariables,
  } = useDisableActionPolicy();
  const {
    mutate: snoozePolicyMutate,
    isLoading: isSnoozing,
    variables: snoozeVariables,
  } = useSnoozeActionPolicy();
  const {
    mutate: unsnoozePolicyMutate,
    isLoading: isUnsnoozing,
    variables: unsnoozeVariables,
  } = useUnsnoozeActionPolicy();

  const enablePolicy = useCallback(
    (id: string) => enablePolicyMutate(id, { onSuccess: () => refetchRef.current() }),
    [enablePolicyMutate]
  );
  const disablePolicy = useCallback(
    (id: string) => disablePolicyMutate(id, { onSuccess: () => refetchRef.current() }),
    [disablePolicyMutate]
  );

  const snoozePolicy = useCallback(
    (args: Parameters<typeof snoozePolicyMutate>[0]) =>
      snoozePolicyMutate(args, { onSuccess: () => refetchRef.current() }),
    [snoozePolicyMutate]
  );
  const unsnoozePolicy = useCallback(
    (id: Parameters<typeof unsnoozePolicyMutate>[0]) =>
      unsnoozePolicyMutate(id, { onSuccess: () => refetchRef.current() }),
    [unsnoozePolicyMutate]
  );
  const { mutate: updateApiKey, isLoading: isUpdatingApiKey } = useUpdateActionPolicyApiKey();
  const { mutate: bulkAction, isLoading: isBulkActionInProgress } = useBulkActionActionPolicies();

  const navigateToEdit = useCallback(
    (id: string) => navigateToUrl(basePath.prepend(paths.actionPolicyEdit(id))),
    [navigateToUrl, basePath]
  );

  const clonePolicy = useCallback(
    (policy: ActionPolicyResponse) => {
      const { name, description, destinations, matcher, groupBy, throttle, tags, groupingMode } =
        policy;
      const data: CreateActionPolicyData = {
        name: `${name} [clone]`,
        description,
        destinations,
        groupingMode: groupingMode ?? 'per_episode',
        ...(tags != null && { tags }),
        ...(matcher != null && { matcher }),
        ...(groupBy != null && { groupBy }),
        ...(throttle != null && { throttle }),
      };
      createActionPolicy(data, { onSuccess: () => refetchRef.current() });
    },
    [createActionPolicy]
  );

  const dataSource = useActionPoliciesDataSource();

  const itemConfig = useMemo(() => ({}), []);

  return (
    <>
      <ContentListProvider
        id="action-policies"
        labels={{
          entity: i18n.translate('xpack.alertingV2.actionPoliciesList.entity', {
            defaultMessage: 'action policy',
          }),
          entityPlural: i18n.translate('xpack.alertingV2.actionPoliciesList.entityPlural', {
            defaultMessage: 'action policies',
          }),
        }}
        dataSource={dataSource}
        item={itemConfig}
        features={{
          sorting: {
            initialSort: { field: 'name', direction: 'asc' },
            fields: [
              {
                field: 'name',
                name: i18n.translate('xpack.alertingV2.actionPoliciesList.sort.name', {
                  defaultMessage: 'Name',
                }),
              },
              {
                field: 'updatedAt',
                name: i18n.translate('xpack.alertingV2.actionPoliciesList.sort.updatedAt', {
                  defaultMessage: 'Last update',
                }),
              },
            ],
          },
          pagination: { initialPageSize: 20 },
          search: true,
          selection: canWrite,
          fields: FEATURES_FIELDS,
        }}
      >
        <ContentList>
          <ActionPoliciesTableContent
            canWrite={canWrite}
            isEnabling={isEnabling}
            enableVariables={enableVariables}
            isDisabling={isDisabling}
            disableVariables={disableVariables}
            isSnoozing={isSnoozing}
            snoozeVariables={snoozeVariables}
            isUnsnoozing={isUnsnoozing}
            unsnoozeVariables={unsnoozeVariables}
            isBulkActionInProgress={isBulkActionInProgress}
            bulkAction={bulkAction}
            onRefetchReady={onRefetchReady}
            onEdit={navigateToEdit}
            onClone={clonePolicy}
            onDelete={setPolicyToDelete}
            onSnooze={(id, until) => snoozePolicy({ id, snoozedUntil: until })}
            onCancelSnooze={(id) => unsnoozePolicy(id)}
            onUpdateApiKey={(id) => setPolicyToUpdateApiKey(id)}
            enablePolicy={enablePolicy}
            disablePolicy={disablePolicy}
          />
        </ContentList>
      </ContentListProvider>

      {policyToDelete && (
        <DeleteActionPolicyConfirmModal
          policyName={policyToDelete.name}
          onCancel={() => setPolicyToDelete(null)}
          onConfirm={() => {
            deleteActionPolicy(policyToDelete.id, {
              onSuccess: () => {
                setPolicyToDelete(null);
                refetchRef.current();
              },
            });
          }}
          isLoading={isDeleting}
        />
      )}

      {policyToUpdateApiKey && (
        <UpdateApiKeyConfirmationModal
          count={1}
          onCancel={() => setPolicyToUpdateApiKey(null)}
          onConfirm={() => {
            updateApiKey(policyToUpdateApiKey, {
              onSuccess: () => setPolicyToUpdateApiKey(null),
            });
          }}
          isLoading={isUpdatingApiKey}
        />
      )}
    </>
  );
};
