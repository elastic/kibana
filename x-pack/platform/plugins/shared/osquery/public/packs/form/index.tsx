/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, isEmpty, map, omit, reduce } from 'lodash';
import type { EuiAccordionProps } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiBottomBar,
  EuiHorizontalRule,
  EuiAccordion,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import deepEqual from 'fast-deep-equal';
import { FormProvider, useForm as useHookForm } from 'react-hook-form';

import { PackShardsField } from './shards/pack_shards_field';
import { useRouterNavigate } from '../../common/lib/kibana';
import { PolicyIdComboBoxField } from './policy_id_combobox_field';
import { QueriesField } from './queries_field';
import { ConfirmDeployAgentPolicyModal } from './confirmation_modal';
import { useAgentPolicies } from '../../agent_policies';
import { useCreatePack } from '../use_create_pack';
import { useUpdatePack } from '../use_update_pack';
import { convertPackQueriesToSO, convertSOQueriesToPack } from './utils';
import type { PackItem } from '../types';
import { NameField } from './name_field';
import { DescriptionField } from './description_field';
import type { PackQueryFormData } from '../queries/use_pack_query_form';
import { PackTypeSelectable } from './shards/pack_type_selectable';
import { overflowCss } from '../utils';

type PackFormData = Omit<PackItem, 'id' | 'queries'> & { queries: PackQueryFormData[] };

const euiAccordionCss = ({ euiTheme }: UseEuiTheme) => ({
  '.euiAccordion__button': {
    color: euiTheme.colors.primary,
  },
});

interface PackFormProps {
  defaultValue?: PackItem;
  editMode?: boolean;
  isReadOnly?: boolean;
  packId?: string;
}

const PackFormComponent: React.FC<PackFormProps> = ({
  defaultValue,
  editMode = false,
  isReadOnly = false,
  packId,
}) => {
  const [shardsToggleState, setShardsToggleState] =
    useState<EuiAccordionProps['forceState']>('closed');
  const handleToggle = useCallback((isOpen: any) => {
    const newState = isOpen ? 'open' : 'closed';
    setShardsToggleState(newState);
  }, []);
  const [packType, setPackType] = useState('policy');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const handleHideConfirmationModal = useCallback(() => setShowConfirmationModal(false), []);

  const { data: { agentPoliciesById } = {} } = useAgentPolicies();

  const cancelButtonProps = useRouterNavigate(
    `packs/${editMode ? packId ?? defaultValue?.id : ''}`
  );

  const { mutateAsync: createAsync } = useCreatePack({
    withRedirect: true,
  });
  const { mutateAsync: updateAsync } = useUpdatePack({
    withRedirect: true,
  });

  const deserializer = (payload: PackItem) => {
    const defaultPolicyIds = filter(
      payload.policy_ids,
      (policyId) => payload.shards?.[policyId] == null
    );

    return {
      ...payload,
      policy_ids: defaultPolicyIds ?? [],
      queries: convertPackQueriesToSO(payload.queries),
      shards: omit(payload.shards, '*') ?? {},
    };
  };

  const hooksForm = useHookForm({
    defaultValues: defaultValue
      ? deserializer(defaultValue)
      : {
          name: '',
          description: '',
          policy_ids: [],
          enabled: true,
          queries: [],
        },
  });

  useEffect(() => {
    if (!isEmpty(defaultValue?.shards)) {
      if (defaultValue?.shards?.['*']) {
        setPackType('global');
      } else {
        setShardsToggleState('open');
      }
    }
  }, [defaultValue, defaultValue?.shards]);

  const {
    handleSubmit,
    watch,
    trigger,
    formState: { isSubmitting },
  } = hooksForm;
  const { policy_ids: policyIds, shards } = watch();

  const getShards = useCallback(() => {
    if (packType === 'global') {
      return { '*': 100 };
    }

    return reduce(
      shards,
      (acc, shard, key) => {
        if (!isEmpty(key)) {
          return { ...acc, [key]: shard };
        }

        return acc;
      },
      {}
    );
  }, [packType, shards]);

  const onSubmit = useCallback(
    async (values: PackFormData) => {
      const serializer = ({
        shards: _,
        policy_ids: payloadAgentPolicyIds,
        queries,
        ...restPayload
      }: PackFormData) => {
        const mappedShards = !isEmpty(shards)
          ? (filter(
              map(shards, (shard, key) => {
                if (!isEmpty(key)) {
                  return key;
                }
              })
            ) as string[])
          : [];
        const policies = [...payloadAgentPolicyIds, ...mappedShards];

        return {
          ...restPayload,
          policy_ids: policies ?? [],
          queries: convertSOQueriesToPack(queries),
          shards: getShards() ?? {},
        };
      };

      try {
        if (editMode && defaultValue?.saved_object_id) {
          await updateAsync({ id: defaultValue?.saved_object_id, ...serializer(values) });
        } else {
          await createAsync(serializer(values));
        }
        // eslint-disable-next-line no-empty
      } catch (e) {}
    },
    [createAsync, defaultValue?.saved_object_id, editMode, getShards, shards, updateAsync]
  );

  const handleSubmitForm = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit]);

  const agentCount = useMemo(
    () =>
      reduce(
        policyIds,
        (acc, policyId) => {
          const agentPolicy = agentPoliciesById && agentPoliciesById[policyId];

          return acc + (agentPolicy?.agents ?? 0);
        },
        0
      ),
    [policyIds, agentPoliciesById]
  );

  const handleSaveClick = useCallback(async () => {
    const isValid = await trigger();
    if (!isValid) {
      return;
    }

    if (agentCount) {
      setShowConfirmationModal(true);

      return;
    }

    handleSubmitForm();
  }, [agentCount, handleSubmitForm, trigger]);

  const handleConfirmConfirmationClick = useCallback(async () => {
    setShowConfirmationModal(false);
    await handleSubmitForm();
  }, [handleSubmitForm]);

  const euiFieldProps = useMemo(() => ({ isDisabled: isReadOnly }), [isReadOnly]);

  const changePackType = useCallback(
    (type: 'global' | 'policy' | 'shards') => {
      setPackType(type);
    },
    [setPackType]
  );

  const options = useMemo(
    () =>
      Object.entries(agentPoliciesById ?? {}).map(([agentPolicyId, agentPolicy]) => ({
        key: agentPolicyId,
        label: agentPolicy.name,
      })),
    [agentPoliciesById]
  );

  const availableOptions = useMemo(() => {
    const currentShardsFieldValues = map(shards, (shard, key) => key);
    const currentPolicyIdsFieldValues = map(policyIds, (policy) => policy);

    const currentValues = [...currentShardsFieldValues, ...currentPolicyIdsFieldValues];

    return options.filter(({ key }) => !currentValues.includes(key));
  }, [shards, policyIds, options]);

  return (
    <>
      <FormProvider {...hooksForm}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <NameField euiFieldProps={euiFieldProps} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />

        <EuiFlexGroup>
          <EuiFlexItem>
            <DescriptionField euiFieldProps={euiFieldProps} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />

        <EuiFlexGroup>
          <PackTypeSelectable packType={packType} setPackType={changePackType} />
        </EuiFlexGroup>
        <EuiSpacer size="m" />

        {packType === 'policy' && (
          <>
            <EuiFlexGroup>
              <EuiFlexItem css={overflowCss}>
                <PolicyIdComboBoxField options={availableOptions} />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />

            <EuiFlexGroup>
              <EuiFlexItem css={overflowCss}>
                <EuiAccordion
                  css={euiAccordionCss}
                  id="shardsToggle"
                  forceState={shardsToggleState}
                  onToggle={handleToggle}
                  buttonContent="Partial deployment (shards)"
                >
                  <EuiSpacer size="xs" />
                  <PackShardsField options={availableOptions} />
                </EuiAccordion>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </>
        )}

        <EuiSpacer size="xl" />

        <EuiHorizontalRule />

        <QueriesField euiFieldProps={euiFieldProps} />
      </FormProvider>
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
      <EuiBottomBar>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty color="text" {...cancelButtonProps}>
                  <FormattedMessage
                    id="xpack.osquery.pack.form.cancelButtonLabel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  isLoading={isSubmitting}
                  color="primary"
                  fill
                  size="m"
                  iconType="save"
                  onClick={handleSaveClick}
                  data-test-subj={`${editMode ? 'update' : 'save'}-pack-button`}
                >
                  {editMode ? (
                    <FormattedMessage
                      id="xpack.osquery.pack.form.updatePackButtonLabel"
                      defaultMessage="Update pack"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.osquery.pack.form.savePackButtonLabel"
                      defaultMessage="Save pack"
                    />
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBottomBar>
      {showConfirmationModal && (
        <ConfirmDeployAgentPolicyModal
          onCancel={handleHideConfirmationModal}
          onConfirm={handleConfirmConfirmationClick}
          agentCount={agentCount}
          agentPolicyCount={policyIds.length}
        />
      )}
    </>
  );
};

export const PackForm = React.memo(PackFormComponent, deepEqual);
