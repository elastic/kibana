/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import type { InternalFieldErrors } from 'react-hook-form';
import { useFieldArray, useForm, useFormContext } from 'react-hook-form';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFlexItem, EuiText } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import deepEqual from 'fast-deep-equal';
import { isEmpty, last, reject } from 'lodash';
import { convertShardsToArray, convertShardsToObject } from '../../../../common/utils/converters';
import type { ShardsArray } from '../../../../common/utils/converters';
import { useAgentPolicies } from '../../../agent_policies';
import { ShardsForm } from './shards_form';

export const defaultShardData = {
  policy: {
    label: '',
    key: '',
  },
  percentage: 100,
};

interface PackShardsFieldProps {
  options: Array<EuiComboBoxOptionOption<string>>;
  isDisabled?: boolean;
}

const PackShardsFieldComponent = ({ options, isDisabled = false }: PackShardsFieldProps) => {
  const {
    watch: watchRoot,
    register: registerRoot,
    setValue: setValueRoot,
    resetField: resetFieldRoot,
    formState: { errors: errorsRoot },
  } = useFormContext();
  const { data: { agentPoliciesById, groupsByPackagePolicyId } = {} } = useAgentPolicies();

  const rootShards = watchRoot('shards');
  const rootPolicyIds: string[] | undefined = watchRoot('policy_ids');

  const initialShardsArray = useMemo(() => {
    const initialConvertedShards = convertShardsToArray(
      rootShards,
      agentPoliciesById,
      groupsByPackagePolicyId,
      rootPolicyIds
    );
    if (!isEmpty(initialConvertedShards)) {
      if (initialConvertedShards[initialConvertedShards.length - 1].policy.key) {
        return [...initialConvertedShards, defaultShardData];
      }

      return initialConvertedShards;
    }

    return [defaultShardData];
  }, [agentPoliciesById, rootShards, groupsByPackagePolicyId, rootPolicyIds]);

  const { control, watch, getFieldState, formState, resetField, setValue, reset } = useForm<{
    shardsArray: ShardsArray;
  }>({
    mode: 'all',
    shouldUnregister: true,
    defaultValues: {
      shardsArray: initialShardsArray,
    },
  });
  const { fields, remove, append } = useFieldArray({
    control,
    name: 'shardsArray',
  });

  const formValue = watch();

  const shardsArrayState = getFieldState('shardsArray', formState);

  useEffect(() => {
    if (!shardsArrayState.isDirty) {
      reset({ shardsArray: initialShardsArray });
      const normalizedShards = convertShardsToObject(initialShardsArray, groupsByPackagePolicyId);
      // Collapsing per-policy shards of a shared integration to one row is a
      // display normalization, not a user edit: the server already writes the
      // max shard per integration (resolveSharedPackagePolicyShard, where a
      // targeted member without a shard counts as 100), so make it the field's
      // new baseline: the form stays pristine on open, and undoing another edit
      // later does not leave it dirty against the pre-normalization value.
      if (!deepEqual(normalizedShards, rootShards)) {
        resetFieldRoot('shards', { defaultValue: normalizedShards });
      }
    }
  }, [
    initialShardsArray,
    groupsByPackagePolicyId,
    rootShards,
    shardsArrayState.isDirty,
    reset,
    resetFieldRoot,
  ]);

  useEffect(() => {
    registerRoot('shards', {
      validate: () => {
        const errors = shardsArrayState.error as InternalFieldErrors[] | undefined;
        if (!errors || !Array.isArray(errors)) {
          return true;
        }

        const shardsData = formValue.shardsArray ?? [];
        const errorsForFilledRows = errors.filter((_, index) => {
          const shard = shardsData[index];

          return shard?.policy?.key;
        });
        const nonEmptyErrors = reject(errorsForFilledRows, isEmpty) as InternalFieldErrors[];

        return !nonEmptyErrors.length;
      },
    });
  }, [shardsArrayState.error, errorsRoot, registerRoot, formValue.shardsArray]);

  useEffect(() => {
    const subscription = watch((data, payload) => {
      if (data?.shardsArray) {
        const lastShardIndex = data?.shardsArray?.length - 1;
        if (payload.name?.startsWith(`shardsArray.${lastShardIndex}.`)) {
          const lastShard = last(data.shardsArray);
          if (lastShard?.policy?.key) {
            append(defaultShardData);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [formValue, append, watch]);

  useEffect(() => {
    const parsedShards = convertShardsToObject(formValue.shardsArray, groupsByPackagePolicyId);
    if (shardsArrayState.isDirty && !deepEqual(parsedShards, rootShards)) {
      setValueRoot('shards', parsedShards, {
        shouldTouch: true,
        shouldDirty: true,
      });
    }
  }, [
    setValueRoot,
    formValue,
    shardsArrayState.isDirty,
    rootShards,
    resetField,
    setValue,
    groupsByPackagePolicyId,
  ]);

  const groupedOptions = useMemo(() => {
    const memberIds = new Set(
      Object.values(groupsByPackagePolicyId ?? {}).flatMap(({ policyIds }) => policyIds)
    );
    const availableIds = new Set(options.map(({ key }) => key));

    return [
      ...options.filter(({ key }) => key == null || !memberIds.has(key)),
      ...Object.entries(groupsByPackagePolicyId ?? {})
        .filter(([, { policyIds }]) => policyIds.every((id) => availableIds.has(id)))
        .map(([key, { policyIds }]) => ({
          key,
          value: key,
          label: policyIds.map((id) => agentPoliciesById?.[id]?.name ?? id).join(', '),
          memberIds: policyIds,
        })),
    ];
  }, [options, groupsByPackagePolicyId, agentPoliciesById]);

  return (
    <>
      <EuiSpacer size="s" />

      {fields.map((item, index, array) => (
        <EuiFlexItem key={item.id}>
          <ShardsForm
            index={index}
            onDelete={remove}
            isLastItem={index === array.length - 1}
            control={control}
            options={groupedOptions}
            isDisabled={isDisabled}
          />
          {groupsByPackagePolicyId?.[formValue.shardsArray?.[index]?.policy?.key] && (
            <EuiText size="xs">
              <FormattedMessage
                id="xpack.osquery.pack.form.sharedIntegration.shardValueDescription"
                defaultMessage="One value applies to the whole integration"
              />
            </EuiText>
          )}
          <EuiSpacer size="xs" />
        </EuiFlexItem>
      ))}
    </>
  );
};

export const PackShardsField = React.memo(PackShardsFieldComponent);
