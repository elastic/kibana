/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiForm,
  EuiHorizontalRule,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamlangProcessorDefinitionWithUIAttributes } from '@kbn/streamlang';
import { isActionBlock } from '@kbn/streamlang';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { isEqual, isEmpty } from 'lodash';
import React, { useState, useEffect, forwardRef } from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { useForm, useWatch, FormProvider } from 'react-hook-form';
import { useSelector } from '@xstate5/react';
import { useDiscardConfirm } from '../../../../../../hooks/use_discard_confirm';
import type { ActionBlockProps } from '.';
import { selectPreviewRecords } from '../../../state_management/simulation_state_machine/selectors';
import {
  useGetStreamEnrichmentState,
  useStreamEnrichmentSelector,
} from '../../../state_management/stream_enrichment_state_machine';
import type { ProcessorFormState } from '../../../types';
import {
  convertFormStateToProcessor,
  SPECIALISED_TYPES,
  getFormStateFromActionStep,
} from '../../../utils';
import { ConfigDrivenProcessorFields } from './config_driven/components/fields';
import type { ConfigDrivenProcessorType } from './config_driven/types';
import { DateProcessorForm } from './date';
import { DissectProcessorForm } from './dissect';
import { GrokProcessorForm } from './grok';
import { ManualIngestPipelineProcessorForm } from './manual_ingest_pipeline';
import { ProcessorErrors } from './processor_metrics';
import { ProcessorTypeSelector } from './processor_type_selector';
import { SetProcessorForm } from './set';
import { useKibana } from '../../../../../../hooks/use_kibana';
import { deleteProcessorPromptOptions, discardChangesPromptOptions } from './prompt_options';

export const ActionBlockEditor = forwardRef<HTMLDivElement, ActionBlockProps>((props, ref) => {
  const { processorMetrics, stepRef } = props;
  const { appParams, core } = useKibana();

  const getEnrichmentState = useGetStreamEnrichmentState();

  const grokCollection = useStreamEnrichmentSelector((snapshot) => snapshot.context.grokCollection);

  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);

  const [defaultValues] = useState(() =>
    getFormStateFromActionStep(
      selectPreviewRecords(getEnrichmentState().context.simulatorRef.getSnapshot().context),
      { grokCollection },
      step as StreamlangProcessorDefinitionWithUIAttributes
    )
  );

  const methods = useForm<ProcessorFormState>({
    // TODO: See if this can be stricter, DeepPartial<ProcessorFormState> doesn't work
    defaultValues: defaultValues as any,
    mode: 'onChange',
  });

  useEffect(() => {
    const { unsubscribe } = methods.watch((value) => {
      const { processorDefinition, processorResources } = convertFormStateToProcessor(
        value as ProcessorFormState
      );
      stepRef.send({
        type: 'step.changeProcessor',
        step: processorDefinition,
        resources: processorResources,
      });
    });
    return () => unsubscribe();
  }, [methods, stepRef]);

  const isConfigured = useSelector(stepRef, (snapshot) => snapshot.matches('configured'));
  const canDelete = useSelector(stepRef, (snapshot) => snapshot.can({ type: 'step.delete' }));
  const canSave = useSelector(stepRef, (snapshot) => snapshot.can({ type: 'step.save' }));

  const hasStreamChanges = useStreamEnrichmentSelector((state) =>
    state.can({ type: 'stream.reset' })
  );
  const hasStepChanges = useSelector(
    stepRef,
    (snapshot) => !isEqual(snapshot.context.previousStep, snapshot.context.step)
  );

  const type = useWatch({ control: methods.control, name: 'action' });

  useUnsavedChangesPrompt({
    hasUnsavedChanges: hasStreamChanges || hasStepChanges,
    history: appParams.history,
    http: core.http,
    navigateToUrl: core.application.navigateToUrl,
    openConfirm: core.overlays.openConfirm,
    shouldPromptOnReplace: false,
  });

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

  if (!isActionBlock(step)) return null;

  return (
    <div ref={ref}>
      <EuiFlexGroup gutterSize="s" direction="column">
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <strong>{step.action.toUpperCase()}</strong>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>
                  <EuiButtonEmpty
                    data-test-subj="streamsAppProcessorConfigurationCancelButton"
                    onClick={handleCancel}
                    size="s"
                  >
                    {i18n.translate(
                      'xpack.streams.streamDetailView.managementTab.enrichment.ProcessorConfiguration.cancel',
                      { defaultMessage: 'Cancel' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton
                    data-test-subj="streamsAppProcessorConfigurationSaveProcessorButton"
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
        </EuiFlexItem>

        <EuiFlexItem>
          <FormProvider {...methods}>
            <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
              <ProcessorTypeSelector disabled={isConfigured} />
              <EuiSpacer size="m" />
              {type === 'date' && <DateProcessorForm />}
              {type === 'grok' && <GrokProcessorForm />}
              {type === 'dissect' && <DissectProcessorForm />}
              {type === 'manual_ingest_pipeline' && <ManualIngestPipelineProcessorForm />}
              {type === 'set' && <SetProcessorForm />}
              {!SPECIALISED_TYPES.includes(type) && (
                <ConfigDrivenProcessorFields type={type as ConfigDrivenProcessorType} />
              )}
            </EuiForm>
            {canDelete && (
              <>
                <EuiHorizontalRule margin="m" />
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="streamsAppProcessorConfigurationButton"
                      color="danger"
                      onClick={handleDelete}
                      size="s"
                    >
                      {i18n.translate(
                        'xpack.streams.streamDetailView.managementTab.enrichment.deleteProcessorLabel',
                        { defaultMessage: 'Delete processor' }
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
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
