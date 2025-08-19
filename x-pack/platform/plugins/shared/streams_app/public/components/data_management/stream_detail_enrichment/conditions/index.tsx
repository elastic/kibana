/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexItem,
  EuiForm,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useState, useEffect } from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { FormProvider, useController, useForm } from 'react-hook-form';
import type { DeepPartial } from 'utility-types';
import React from 'react';
import { useSelector } from '@xstate5/react';
import { isEqual } from 'lodash';
import { getFilterOperator, getFilterValue, isCondition, type Condition } from '@kbn/streamlang';
import { useDiscardConfirm } from '../../../../hooks/use_discard_confirm';
import { selectPreviewRecords } from '../state_management/simulation_state_machine/selectors';
import type { StreamEnrichmentContextType } from '../state_management/stream_enrichment_state_machine';
import {
  useGetStreamEnrichmentState,
  useStreamEnrichmentSelector,
} from '../state_management/stream_enrichment_state_machine';
import type { WhereBlockFormState } from '../types';
import { getFormStateFrom, convertWhereBlockFormStateToConfiguration } from '../utils';
import { StepsListItem } from '../steps_list';
import { deleteConditionPromptOptions, discardChangesPromptOptions } from './prompt_options';
import { ConditionEditor } from '../../condition_editor';
import { AddStepButton } from '../add_step_button';

export const WhereBlock = ({
  stepRef,
  childSteps,
}: {
  stepRef: StreamEnrichmentContextType['stepRefs'][number];
  childSteps: StreamEnrichmentContextType['stepRefs'][number][];
}) => {
  const isDraft = useSelector(stepRef, (snapshot) => snapshot.matches('draft'));
  const isEditing = useSelector(stepRef, (snapshot) => snapshot.matches({ configured: 'editing' }));

  if (isDraft) {
    return <WhereBlockConfiguration stepRef={stepRef} />;
  }
  return (
    <EuiPanel paddingSize="m" hasShadow={false}>
      {isEditing ? (
        <WhereBlockConfiguration stepRef={stepRef} />
      ) : (
        <WhereBlockSummary stepRef={stepRef} />
      )}
      {childSteps.length > 0 && (
        <ul>
          {childSteps.map((childStep) => (
            <StepsListItem key={childStep.id} stepRef={childStep} />
          ))}
        </ul>
      )}
    </EuiPanel>
  );
};

const WhereBlockConfiguration = ({
  stepRef,
}: {
  stepRef: StreamEnrichmentContextType['stepRefs'][number];
}) => {
  const getEnrichmentState = useGetStreamEnrichmentState();
  const grokCollection = useStreamEnrichmentSelector((snapshot) => snapshot.context.grokCollection);

  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);
  const isConfigured = useSelector(stepRef, (snapshot) => snapshot.matches('configured'));
  const canDelete = useSelector(stepRef, (snapshot) => snapshot.can({ type: 'step.delete' }));
  const canSave = useSelector(stepRef, (snapshot) => snapshot.can({ type: 'step.save' }));

  // TODO: Simplify this - Where blocks have no need for preview records, Grok collection etc
  const [defaultValues] = useState(() =>
    getFormStateFrom(
      selectPreviewRecords(getEnrichmentState().context.simulatorRef.getSnapshot().context),
      { grokCollection },
      step
    )
  );

  const hasStepChanges = useSelector(
    stepRef,
    (snapshot) => !isEqual(snapshot.context.previousStep, snapshot.context.step)
  );

  const handleCancel = useDiscardConfirm(() => stepRef.send({ type: 'step.cancel' }), {
    enabled: hasStepChanges,
    ...discardChangesPromptOptions,
  });

  const handleDelete = useDiscardConfirm(() => stepRef.send({ type: 'step.delete' }), {
    enabled: canDelete,
    ...deleteConditionPromptOptions,
  });

  const methods = useForm<WhereBlockFormState>({
    defaultValues: defaultValues as DeepPartial<WhereBlockFormState>,
    mode: 'onChange',
  });

  useEffect(() => {
    const { unsubscribe } = methods.watch((value) => {
      const { whereDefinition } = convertWhereBlockFormStateToConfiguration(
        value as WhereBlockFormState
      );
      stepRef.send({
        type: 'step.changeCondition',
        step: whereDefinition,
      });
    });
    return () => unsubscribe();
  }, [methods, stepRef]);

  const handleSubmit: SubmitHandler<WhereBlockFormState> = () => {
    stepRef.send({ type: 'step.save' });
  };

  return (
    <EuiPanel paddingSize="m" hasShadow={false}>
      <FormProvider {...methods}>
        <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
          <WhereBlockConditionEditor />
        </EuiForm>
      </FormProvider>

      <EuiFlexGroup gutterSize="s">
        {canDelete && (
          <EuiFlexItem>
            <>
              <EuiButton
                data-test-subj="streamsAppWhereBlockConfigurationDeleteButton"
                color="danger"
                onClick={handleDelete}
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.deleteWhereBlockLabel',
                  { defaultMessage: 'Delete condition' }
                )}
              </EuiButton>
            </>
          </EuiFlexItem>
        )}
        <EuiFlexItem />
        <EuiButtonEmpty
          data-test-subj="streamsAppWhereBlockConfigurationCancelButton"
          onClick={handleCancel}
          size="s"
        >
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.WhereBlockConfiguration.cancel',
            { defaultMessage: 'Cancel' }
          )}
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="streamsAppConditionConfigurationSaveConditionButton"
          size="s"
          fill
          onClick={methods.handleSubmit(handleSubmit)}
          disabled={!canSave}
        >
          {isConfigured
            ? i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.WhereBlockConfiguration.confirmUpdateCondition',
                { defaultMessage: 'Update' }
              )
            : i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.WhereBlockConfiguration.confirmCreateCondition',
                { defaultMessage: 'Create condition' }
              )}
        </EuiButton>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const WhereBlockConditionEditor = () => {
  const { field } = useController<WhereBlockFormState, 'where'>({
    name: 'where',
    rules: {
      validate: (value) => isCondition(value),
    },
  });

  if (field.value === undefined) {
    return null;
  }

  return (
    <ConditionEditor
      condition={field.value as unknown as Condition}
      onConditionChange={field.onChange as (condition: Condition) => void}
    />
  );
};

const WhereBlockSummary = ({
  stepRef,
}: {
  stepRef: StreamEnrichmentContextType['stepRefs'][number];
}) => {
  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);
  // TODO: Summaries will need to support a fallback for complex syntax editor conditions
  const operator = getFilterOperator(step.where);
  const value = getFilterValue(step.where);
  const field = step.where.field;
  return (
    <>
      {'WHERE'} <EuiBadge>{field}</EuiBadge> {operator} <EuiBadge>{value}</EuiBadge>
      <AddStepButton parentId={stepRef.id} />
    </>
  );
};
