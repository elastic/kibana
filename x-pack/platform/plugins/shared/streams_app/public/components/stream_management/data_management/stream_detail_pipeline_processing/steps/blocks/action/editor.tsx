/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelector } from '@xstate/react';
import { isEmpty, isEqual } from 'lodash';
import React, { forwardRef, useEffect, useState } from 'react';
import type { DefaultValues, SubmitHandler } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';
import { useGrokCollection } from '@kbn/grok-ui';
import type { ActionBlockProps } from '.';
import { useDiscardConfirm } from '../../../../../../../hooks/use_discard_confirm';
import { selectPreviewRecords } from '../../../state_management/simulation_state_machine/selectors';
import {
  useGetStreamEnrichmentState,
  useStreamEnrichmentSelector,
} from '../../../state_management/stream_enrichment_state_machine';
import {
  selectStreamType,
  selectValidationErrors,
} from '../../../state_management/stream_enrichment_state_machine/selectors';
import type {
  PipelineProcessorDefinitionWithUIAttributes,
  ProcessorFormState,
} from '../../../types';
import {
  convertFormStateToProcessor,
  getFormStateFromActionStep,
  SPECIALISED_TYPES,
} from '../../../utils';
import { ConfigDrivenProcessorFields } from './config_driven/components/fields';
import type { ConfigDrivenProcessorType } from './config_driven/types';
import { ConvertProcessorForm } from './convert';
import { DateProcessorForm } from './date';
import { DissectProcessorForm } from './dissect';
import { DropProcessorForm } from './drop_document';
import { GrokProcessorForm } from './grok';
import { ProcessorContextProvider } from './processor_context';
import { ProcessorErrors } from './processor_metrics';
import { ProcessorTypeSelector } from './processor_type_selector';
import { deleteProcessorPromptOptions, discardChangesPromptOptions } from './prompt_options';
import { ReplaceProcessorForm } from './replace';
import { RedactProcessorForm } from './redact';
import { SetProcessorForm } from './set';
import { SplitProcessorForm } from './split';
import { SortProcessorForm } from './sort';
import { TransformStringProcessorForm } from './transform_string';
import { JoinProcessorForm } from './join';
import { NetworkDirectionProcessorForm } from './network_direction';
import { EnrichProcessorForm } from './enrich';
import { UserAgentProcessorForm } from './user_agent';
import { RegisteredDomainProcessorForm } from './registered_domain';

type WatchFormChanges = (callback: (value: Partial<ProcessorFormState>) => void) => {
  unsubscribe: () => void;
};
type WatchFormField = (name: 'action') => ProcessorFormState['action'] | undefined;

const getHiddenNativeProcessorOptions = (step: ProcessorFormState): Record<string, unknown> => {
  const hiddenOptions: Record<string, unknown> = {};
  const stepRecord = step as unknown as Record<string, unknown>;

  if ('if' in stepRecord) {
    hiddenOptions.if = stepRecord.if;
  }

  if ('on_failure' in stepRecord) {
    hiddenOptions.on_failure = stepRecord.on_failure;
  }

  return hiddenOptions;
};

export const ActionBlockEditor = forwardRef<HTMLDivElement, ActionBlockProps>((props, ref) => {
  const { processorMetrics, stepRef } = props;

  const getEnrichmentState = useGetStreamEnrichmentState();

  const { grokCollection } = useGrokCollection();

  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);
  const processorStep = step as PipelineProcessorDefinitionWithUIAttributes;

  const [defaultValues] = useState(() =>
    getFormStateFromActionStep(
      selectPreviewRecords(getEnrichmentState().context.simulatorRef.getSnapshot().context),
      { grokCollection: grokCollection! },
      processorStep
    )
  );
  const [hiddenNativeProcessorOptions] = useState(() =>
    getHiddenNativeProcessorOptions(processorStep)
  );

  const validationErrors = useStreamEnrichmentSelector((snapshot) => {
    const errors = selectValidationErrors(snapshot.context);
    return errors.get(processorStep.customIdentifier) || [];
  });

  const methods = useForm<ProcessorFormState>({
    defaultValues: defaultValues as DefaultValues<ProcessorFormState>,
    mode: 'onChange',
  });

  useEffect(() => {
    const { unsubscribe } = (methods.watch as WatchFormChanges)((value) => {
      const { processorDefinition } = convertFormStateToProcessor(value as ProcessorFormState);
      stepRef.send({
        type: 'step.changeProcessor',
        step: {
          ...processorDefinition,
          ...hiddenNativeProcessorOptions,
        },
      });
    });
    return () => unsubscribe();
  }, [hiddenNativeProcessorOptions, methods, stepRef]);

  const isConfigured = useSelector(stepRef, (snapshot) => snapshot.matches('configured'));
  const canDelete = useSelector(stepRef, (snapshot) => snapshot.can({ type: 'step.delete' }));
  const canSaveStateMachine = useSelector(stepRef, (snapshot) =>
    snapshot.can({ type: 'step.save' })
  );

  const hasConditionError = 'where' in methods.formState.errors;
  const canSave = canSaveStateMachine && !hasConditionError;

  const hasStepChanges = useSelector(
    stepRef,
    (snapshot) => !isEqual(snapshot.context.previousStep, snapshot.context.step)
  );

  const streamType = useStreamEnrichmentSelector((snapshot) => selectStreamType(snapshot.context));

  const type = (methods.watch as WatchFormField)('action') ?? defaultValues.action;

  // Note: Navigation prompts for unsaved changes are handled at the page level (page_content.tsx)
  // This editor only handles cancel confirmation via useDiscardConfirm below

  const handleCancel = useDiscardConfirm(() => stepRef.send({ type: 'step.cancel' }), {
    enabled: hasStepChanges,
    ...discardChangesPromptOptions,
  });

  const handleDelete = useDiscardConfirm(() => stepRef.send({ type: 'step.delete' }), {
    enabled: canDelete,
    ...deleteProcessorPromptOptions,
  });

  const handleSubmit: SubmitHandler<ProcessorFormState> = () => {
    stepRef.send({ type: 'step.save' });
  };

  if (!('action' in step)) return null;

  return (
    <div ref={ref}>
      <EuiFlexGroup gutterSize="s" direction="column">
        <strong>{processorStep.action.toUpperCase()}</strong>
        <EuiFlexItem>
          <FormProvider {...methods}>
            <ProcessorContextProvider processorId={processorStep.customIdentifier}>
              <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
                <ProcessorTypeSelector disabled={isConfigured} />
                <EuiSpacer size="m" />
                {type === 'convert' && <ConvertProcessorForm />}
                {type === 'gsub' && <ReplaceProcessorForm />}
                {type === 'redact' && <RedactProcessorForm />}
                {type === 'date' && <DateProcessorForm />}
                {type === 'grok' && <GrokProcessorForm />}
                {type === 'dissect' && <DissectProcessorForm />}
                {type === 'set' && <SetProcessorForm />}
                {type === 'drop' && <DropProcessorForm />}
                {type === 'uppercase' && <TransformStringProcessorForm />}
                {type === 'lowercase' && <TransformStringProcessorForm />}
                {type === 'trim' && <TransformStringProcessorForm />}
                {type === 'split' && <SplitProcessorForm />}
                {type === 'sort' && <SortProcessorForm />}
                {type === 'join' && <JoinProcessorForm />}
                {type === 'network_direction' && <NetworkDirectionProcessorForm />}
                {type === 'enrich' && <EnrichProcessorForm />}
                {type === 'user_agent' && <UserAgentProcessorForm />}
                {type === 'registered_domain' && <RegisteredDomainProcessorForm />}
                {!SPECIALISED_TYPES.includes(type) && (
                  <ConfigDrivenProcessorFields type={type as ConfigDrivenProcessorType} />
                )}
              </EuiForm>
            </ProcessorContextProvider>
            <EuiHorizontalRule margin="m" />
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                {canDelete && (
                  <EuiButton
                    data-test-subj="streamsAppProcessorConfigurationDeleteButton"
                    data-stream-type={streamType}
                    color="danger"
                    onClick={handleDelete}
                    size="s"
                  >
                    {i18n.translate(
                      'xpack.streams.streamDetailView.managementTab.enrichment.deleteProcessorLabel',
                      { defaultMessage: 'Delete processor' }
                    )}
                  </EuiButton>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="streamsAppProcessorConfigurationCancelButton"
                      data-stream-type={streamType}
                      onClick={handleCancel}
                      size="s"
                    >
                      {i18n.translate(
                        'xpack.streams.streamDetailView.managementTab.enrichment.ProcessorConfiguration.cancel',
                        { defaultMessage: 'Cancel' }
                      )}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="streamsAppProcessorConfigurationSaveProcessorButton"
                      data-stream-type={streamType}
                      size="s"
                      fill
                      onClick={methods.handleSubmit(handleSubmit)}
                      disabled={!canSave}
                    >
                      {isConfigured
                        ? i18n.translate(
                            'xpack.streams.streamDetailView.managementTab.enrichment.ProcessorConfiguration.confirmProcessor',
                            { defaultMessage: 'Update' }
                          )
                        : i18n.translate(
                            'xpack.streams.streamDetailView.managementTab.enrichment.ProcessorConfiguration.confirmCreateProcessor',
                            { defaultMessage: 'Create' }
                          )}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            {validationErrors.length > 0 && (
              <>
                <EuiSpacer size="m" />
                <EuiCallOut
                  announceOnMount
                  title={i18n.translate(
                    'xpack.streams.streamDetailView.managementTab.enrichment.validationErrors.title',
                    { defaultMessage: 'Validation errors' }
                  )}
                  color="danger"
                  iconType="warning"
                  size="s"
                >
                  <ul>
                    {validationErrors.map((error, index: number) => (
                      <li key={index}>{error.message}</li>
                    ))}
                  </ul>
                </EuiCallOut>
              </>
            )}
            {processorMetrics && !isEmpty(processorMetrics.errors) && (
              <ProcessorErrors metrics={processorMetrics} />
            )}
          </FormProvider>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
});
