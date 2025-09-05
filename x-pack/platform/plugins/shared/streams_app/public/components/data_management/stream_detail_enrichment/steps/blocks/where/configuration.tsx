/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Condition } from '@kbn/streamlang';
import { isCondition } from '@kbn/streamlang';
import { isEqual } from 'lodash';
import React, { useState, useEffect, forwardRef, useMemo } from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { useForm, FormProvider, useController } from 'react-hook-form';
import type { DeepPartial } from 'utility-types';
import { useSelector } from '@xstate5/react';
import { useDiscardConfirm } from '../../../../../../hooks/use_discard_confirm';
import { ProcessorConditionEditorWrapper } from '../../../../condition_editor';
import { selectPreviewRecords } from '../../../state_management/simulation_state_machine/selectors';
import type { StreamEnrichmentContextType } from '../../../state_management/stream_enrichment_state_machine';
import {
  useGetStreamEnrichmentState,
  useStreamEnrichmentSelector,
} from '../../../state_management/stream_enrichment_state_machine';
import type { WhereBlockFormState } from '../../../types';
import { getFormStateFrom, convertWhereBlockFormStateToConfiguration } from '../../../utils';
import {
  discardChangesPromptOptions,
  deleteConditionPromptOptions,
  saveConditionPromptOptions,
} from './prompt_options';
import { collectDescendantIds } from '../../../state_management/stream_enrichment_state_machine/utils';

interface WhereBlockConfigurationProps {
  stepRef: StreamEnrichmentContextType['stepRefs'][number];
}

export const WhereBlockConfiguration = forwardRef<HTMLDivElement, WhereBlockConfigurationProps>(
  (props, ref) => {
    const { euiTheme } = useEuiTheme();
    const { stepRef } = props;
    const getEnrichmentState = useGetStreamEnrichmentState();
    const grokCollection = useStreamEnrichmentSelector(
      (snapshot) => snapshot.context.grokCollection
    );

    const stepRefs = useStreamEnrichmentSelector((snapshot) => snapshot.context.stepRefs);

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

    const childSteps = useMemo(() => {
      return collectDescendantIds(step.customIdentifier, stepRefs).size;
    }, [step.customIdentifier, stepRefs]);

    const handleSaveWithChildren = useDiscardConfirm(() => stepRef.send({ type: 'step.save' }), {
      enabled: canSave,
      ...saveConditionPromptOptions,
      message: i18n.translate('xpack.streams.enrichment.condition.saveCondition.message', {
        defaultMessage:
          'Be aware that updating this might change or break some of the items nested underneath. {childCount} {childCount, plural, one {child} other {children}} will be affected by this change.',
        values: {
          childCount: childSteps,
        },
      }),
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
      if (childSteps > 0) {
        handleSaveWithChildren();
      } else {
        stepRef.send({ type: 'step.save' });
      }
    };

    return (
      <div ref={ref}>
        <FormProvider {...methods}>
          <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
            <WhereBlockConditionEditor />
          </EuiForm>
        </FormProvider>
        <EuiSpacer size="m" />
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
        </EuiFlexGroup>
      </div>
    );
  }
);

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
    <ProcessorConditionEditorWrapper
      condition={field.value as unknown as Condition}
      onConditionChange={field.onChange as (condition: Condition) => void}
    />
  );
};
