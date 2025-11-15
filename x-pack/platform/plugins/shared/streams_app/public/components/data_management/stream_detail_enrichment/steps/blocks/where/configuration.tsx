/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiForm,
  EuiFlexGroup,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Condition, StreamlangWhereBlockWithUIAttributes } from '@kbn/streamlang';
import {
  isCondition,
  isFilterConditionObject,
  getFilterOperator,
  getFilterValue,
} from '@kbn/streamlang';
import type { FilterCondition } from '@kbn/streamlang';
import { isEqual, isPlainObject } from 'lodash';
import React, { useState, useEffect, forwardRef } from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { useForm, FormProvider, useController } from 'react-hook-form';
import type { DeepPartial } from 'utility-types';
import { useSelector } from '@xstate5/react';
import { useDiscardConfirm } from '../../../../../../hooks/use_discard_confirm';
import type { StreamEnrichmentContextType } from '../../../state_management/stream_enrichment_state_machine';
import type { WhereBlockFormState } from '../../../types';
import {
  getFormStateFromWhereStep,
  convertWhereBlockFormStateToConfiguration,
} from '../../../utils';
import { discardChangesPromptOptions, deleteConditionPromptOptions } from './prompt_options';
import { ProcessorConditionEditorWrapper } from '../../../processor_condition_editor';

interface WhereBlockConfigurationProps {
  stepRef: StreamEnrichmentContextType['stepRefs'][number];
}

export const WhereBlockConfiguration = forwardRef<HTMLDivElement, WhereBlockConfigurationProps>(
  (props, ref) => {
    const { stepRef } = props;

    const step = useSelector(stepRef, (snapshot) => snapshot.context.step);

    const isConfigured = useSelector(stepRef, (snapshot) => snapshot.matches('configured'));
    const canDelete = useSelector(stepRef, (snapshot) => snapshot.can({ type: 'step.delete' }));
    const canSave = useSelector(stepRef, (snapshot) => snapshot.can({ type: 'step.save' }));

    const [defaultValues] = useState(() =>
      getFormStateFromWhereStep(step as StreamlangWhereBlockWithUIAttributes)
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

    const isValid = methods.formState.isValid;

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
      <div ref={ref}>
        <FormProvider {...methods}>
          <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
            <WhereBlockConditionEditor />
          </EuiForm>
        </FormProvider>
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="spaceBetween" wrap>
          <EuiFlexItem>
            {canDelete && (
              <div>
                <EuiButton
                  data-test-subj="streamsAppWhereBlockConfigurationDeleteButton"
                  color="danger"
                  onClick={handleDelete}
                  size="s"
                >
                  {i18n.translate(
                    'xpack.streams.streamDetailView.managementTab.enrichment.deleteWhereBlockLabel',
                    { defaultMessage: 'Delete condition' }
                  )}
                </EuiButton>
              </div>
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd">
              <div>
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
              </div>
              <div>
                <EuiButton
                  data-test-subj="streamsAppConditionConfigurationSaveConditionButton"
                  size="s"
                  fill
                  onClick={methods.handleSubmit(handleSubmit)}
                  disabled={!canSave || !isValid}
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
              </div>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
);

export const WhereBlockConditionEditor = () => {
  const { field } = useController<WhereBlockFormState, 'where'>({
    name: 'where',
    rules: {
      validate: (value) => {
        // First check: validate structure with existing isCondition check
        if (!isCondition(value)) {
          return false;
        }

        // Additional check: ensure filter conditions have complete values
        if (isPlainObject(value) && isFilterConditionObject(value)) {
          const filterCondition = value as FilterCondition;

          // Field must be non-empty
          if (!filterCondition.field || filterCondition.field.trim() === '') {
            return false;
          }

          const operator = getFilterOperator(filterCondition);
          const conditionValue = getFilterValue(filterCondition);

          // For range conditions, check that both boundaries are filled
          if (
            operator === 'range' &&
            typeof conditionValue === 'object' &&
            conditionValue !== null
          ) {
            const hasFrom =
              (conditionValue.gte !== undefined && conditionValue.gte !== '') ||
              (conditionValue.gt !== undefined && conditionValue.gt !== '');
            const hasTo =
              (conditionValue.lte !== undefined && conditionValue.lte !== '') ||
              (conditionValue.lt !== undefined && conditionValue.lt !== '');
            return hasFrom && hasTo;
          }

          // For boolean values, any boolean is valid (exists operator or eq/neq shorthand)
          if (typeof conditionValue === 'boolean') {
            return true;
          }

          // For string values, must be non-empty
          if (typeof conditionValue === 'string') {
            return conditionValue.trim() !== '';
          }

          // If we reach here, the value is missing or invalid
          return false;
        }

        // For other valid conditions, pass through
        return true;
      },
    },
  });

  if (field.value === undefined) {
    return null;
  }

  return (
    <ProcessorConditionEditorWrapper
      condition={field.value as unknown as Condition}
      onConditionChange={field.onChange as (condition: Condition) => void}
    />
  );
};
