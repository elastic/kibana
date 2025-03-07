/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiForm,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiPanel,
  useEuiTheme,
  EuiHorizontalRule,
  EuiAccordion,
  EuiButtonIcon,
  EuiIcon,
  EuiText,
  EuiBadge,
} from '@elastic/eui';
import { useSelector } from '@xstate5/react';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React, { useEffect, useMemo } from 'react';
import { useForm, SubmitHandler, FormProvider, useWatch } from 'react-hook-form';
import { css } from '@emotion/react';
import { DiscardPromptOptions, useDiscardConfirm } from '../../../../hooks/use_discard_confirm';
import { DissectProcessorForm } from './dissect';
import { GrokProcessorForm } from './grok';
import { ProcessorTypeSelector } from './processor_type_selector';
import { ProcessorFormState, ProcessorDefinitionWithUIAttributes } from '../types';
import {
  getFormStateFrom,
  convertFormStateToProcessor,
  isGrokProcessor,
  isDissectProcessor,
  getDefaultFormStateByType,
} from '../utils';
import { ProcessorErrors, ProcessorMetricBadges } from './processor_metrics';
import {
  useStreamEnrichmentEvents,
  useStreamsEnrichmentSelector,
  useSimulatorSelector,
  StreamEnrichmentContext,
} from '../state_management/stream_enrichment_state_machine';
import { ProcessorMetrics } from '../state_management/simulation_state_machine';

export function AddProcessorPanel() {
  const { euiTheme } = useEuiTheme();

  const { addProcessor } = useStreamEnrichmentEvents();

  const processorRef = useStreamsEnrichmentSelector((state) =>
    state.context.processorsRefs.find((p) => p.getSnapshot().matches('draft'))
  );
  const processorMetrics = useSimulatorSelector(
    (state) => processorRef && state.context.simulation?.processors_metrics[processorRef.id]
  );

  const isOpen = Boolean(processorRef);

  const defaultValues = useMemo(() => getDefaultFormStateByType('grok'), []);

  const methods = useForm<ProcessorFormState>({ defaultValues, mode: 'onChange' });

  const type = useWatch({ control: methods.control, name: 'type' });

  useEffect(() => {
    if (!processorRef) {
      methods.reset(defaultValues);
    }
  }, [defaultValues, methods, processorRef]);

  useEffect(() => {
    if (processorRef) {
      const { unsubscribe } = methods.watch((value) => {
        const processor = convertFormStateToProcessor(value as ProcessorFormState);
        processorRef.send({ type: 'processor.change', processor });
      });

      return () => unsubscribe();
    }
  }, [methods, processorRef]);

  const handleCancel = useDiscardConfirm(
    () => processorRef?.send({ type: 'processor.cancel' }),
    discardChangesPromptOptions
  );

  const handleSubmit: SubmitHandler<ProcessorFormState> = async () => {
    processorRef?.send({ type: 'processor.stage' });
  };

  const handleOpen = () => {
    const draftProcessor = createDraftProcessorFromForm(defaultValues);
    addProcessor(draftProcessor);
  };

  const buttonContent = isOpen ? (
    i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processorPanel.addingProcessor',
      { defaultMessage: 'Adding processor' }
    )
  ) : (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      <EuiIcon type="plus" />
      {i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.addProcessorAction',
        { defaultMessage: 'Add a processor' }
      )}
    </EuiFlexGroup>
  );

  return (
    <EuiPanel
      color={isOpen ? 'subdued' : undefined}
      hasBorder
      css={css`
        border: ${euiTheme.border.thin};
        padding: ${euiTheme.size.m};
      `}
    >
      <EuiAccordion
        id="add-processor-accordion"
        arrowProps={{
          css: { display: 'none' },
        }}
        buttonContent={buttonContent}
        buttonElement="div"
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={handleOpen}
        extraAction={
          isOpen ? (
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiButtonEmpty
                data-test-subj="streamsAppAddProcessorPanelCancelButton"
                onClick={handleCancel}
                size="s"
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processorPanel.cancel',
                  { defaultMessage: 'Cancel' }
                )}
              </EuiButtonEmpty>
              <EuiButton
                data-test-subj="streamsAppAddProcessorPanelAddProcessorButton"
                size="s"
                fill
                onClick={methods.handleSubmit(handleSubmit)}
                disabled={!methods.formState.isValid && methods.formState.isSubmitted}
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processorPanel.confirmAddProcessor',
                  { defaultMessage: 'Add processor' }
                )}
              </EuiButton>
            </EuiFlexGroup>
          ) : null
        }
      >
        <EuiSpacer size="s" />
        <FormProvider {...methods}>
          <ProcessorMetricsHeader metrics={processorMetrics} />
          <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
            <ProcessorTypeSelector />
            <EuiSpacer size="m" />
            {type === 'date' && <DateProcessorForm />}
            {type === 'dissect' && <DissectProcessorForm />}
            {type === 'grok' && <GrokProcessorForm />}
          </EuiForm>
          {processorMetrics && !isEmpty(processorMetrics.errors) && (
            <ProcessorErrors metrics={processorMetrics} />
          )}
        </FormProvider>
      </EuiAccordion>
    </EuiPanel>
  );
}

const createDraftProcessorFromForm = (
  formState: ProcessorFormState
): ProcessorDefinitionWithUIAttributes => {
  const processingDefinition = convertFormStateToProcessor(formState);

  return {
    id: 'draft',
    type: formState.type,
    ...processingDefinition,
  };
};

export interface EditProcessorPanelProps {
  processorRef: StreamEnrichmentContext['processorsRefs'][number];
  processorMetrics?: ProcessorMetrics;
}

export function EditProcessorPanel({ processorRef, processorMetrics }: EditProcessorPanelProps) {
  const { euiTheme } = useEuiTheme();
  const state = useSelector(processorRef, (s) => s);
  const previousProcessor = state.context.previousProcessor;
  const processor = state.context.processor;

  const processorDescription = getProcessorDescription(processor);

  const isOpen = state.matches({ configured: 'edit' });
  const isNew = state.context.isNew;
  const isUnsaved = isNew || state.context.isUpdated;

  const defaultValues = useMemo(() => getFormStateFrom(processor), [processor]);

  const methods = useForm<ProcessorFormState>({
    defaultValues,
    mode: 'onChange',
  });

  const type = useWatch({ control: methods.control, name: 'type' });

  useEffect(() => {
    const { unsubscribe } = methods.watch((value) => {
      const processingDefinition = convertFormStateToProcessor(value as ProcessorFormState);
      processorRef.send({
        type: 'processor.change',
        processor: processingDefinition,
      });
    });
    return () => unsubscribe();
  }, [methods, processorRef]);

  useEffect(() => {
    const subscription = processorRef.on('processor.changesDiscarded', () => {
      methods.reset(getFormStateFrom(previousProcessor));
    });

    return () => subscription.unsubscribe();
  }, [methods, previousProcessor, processorRef]);

  const handleCancel = useDiscardConfirm(
    () => processorRef?.send({ type: 'processor.cancel' }),
    discardChangesPromptOptions
  );

  const handleProcessorDelete = useDiscardConfirm(
    () => processorRef?.send({ type: 'processor.delete' }),
    deleteProcessorPromptOptions
  );

  const handleSubmit: SubmitHandler<ProcessorFormState> = () => {
    processorRef.send({ type: 'processor.update' });
  };

  const handleOpen = () => {
    processorRef.send({ type: 'processor.edit' });
  };

  const buttonContent = isOpen ? (
    <strong>{processor.type.toUpperCase()}</strong>
  ) : (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      <EuiIcon type="grab" />
      <strong>{processor.type.toUpperCase()}</strong>
      <EuiText component="span" size="s" color="subdued" className="eui-textTruncate">
        {processorDescription}
      </EuiText>
    </EuiFlexGroup>
  );

  return (
    <EuiPanel
      hasBorder
      color={isNew ? 'subdued' : undefined}
      css={css`
        border: ${euiTheme.border.thin};
        padding: ${euiTheme.size.m};
      `}
    >
      <EuiAccordion
        id="edit-processor-accordion"
        arrowProps={{
          css: { display: 'none' },
        }}
        buttonContent={buttonContent}
        buttonContentClassName="eui-textTruncate"
        buttonElement="div"
        buttonProps={{
          /* Allow text ellipsis in flex child nodes */
          css: css`
            min-width: 0;
            &:is(:hover, :focus) {
              cursor: grab;
              text-decoration: none;
            }
          `,
        }}
        forceState={isOpen ? 'open' : 'closed'}
        extraAction={
          isOpen ? (
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiButtonEmpty
                data-test-subj="streamsAppEditProcessorPanelCancelButton"
                onClick={handleCancel}
                size="s"
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processorPanel.cancel',
                  { defaultMessage: 'Cancel' }
                )}
              </EuiButtonEmpty>
              <EuiButton
                data-test-subj="streamsAppEditProcessorPanelUpdateProcessorButton"
                size="s"
                fill
                onClick={methods.handleSubmit(handleSubmit)}
                disabled={!methods.formState.isValid || !state.can({ type: 'processor.update' })}
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processorPanel.confirmEditProcessor',
                  { defaultMessage: 'Update processor' }
                )}
              </EuiButton>
            </EuiFlexGroup>
          ) : (
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              {processorMetrics && <ProcessorMetricBadges {...processorMetrics} />}
              {isUnsaved && (
                <EuiBadge>
                  {i18n.translate(
                    'xpack.streams.streamDetailView.managementTab.enrichment.processorPanel.unsavedBadge',
                    { defaultMessage: 'Unsaved' }
                  )}
                </EuiBadge>
              )}
              <EuiButtonIcon
                data-test-subj="streamsAppEditProcessorPanelButton"
                onClick={handleOpen}
                iconType="pencil"
                color="text"
                size="xs"
                aria-label={i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.editProcessorAction',
                  { defaultMessage: 'Edit {type} processor', values: { type: processor.type } }
                )}
              />
            </EuiFlexGroup>
          )
        }
      >
        <EuiSpacer size="s" />
        <FormProvider {...methods}>
          <ProcessorMetricsHeader metrics={processorMetrics} />
          <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
            <ProcessorTypeSelector disabled />
            <EuiSpacer size="m" />
            {type === 'date' && <DateProcessorForm />}
            {type === 'grok' && <GrokProcessorForm />}
            {type === 'dissect' && <DissectProcessorForm />}
          </EuiForm>
          <EuiHorizontalRule margin="m" />
          <EuiButton
            data-test-subj="streamsAppEditProcessorPanelButton"
            color="danger"
            onClick={handleProcessorDelete}
          >
            {deleteProcessorLabel}
          </EuiButton>
          {processorMetrics && !isEmpty(processorMetrics.errors) && (
            <ProcessorErrors metrics={processorMetrics} />
          )}
        </FormProvider>
      </EuiAccordion>
    </EuiPanel>
  );
}

const ProcessorMetricsHeader = ({ metrics }: { metrics?: ProcessorMetrics }) => {
  if (!metrics) return null;

  return (
    <>
      <ProcessorMetricBadges {...metrics} />
      <EuiSpacer size="m" />
    </>
  );
};

const deleteProcessorLabel = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.deleteProcessorLabel',
  { defaultMessage: 'Delete processor' }
);

const getProcessorDescription = (processor: ProcessorDefinitionWithUIAttributes) => {
  if (isGrokProcessor(processor)) {
    return processor.grok.patterns.join(' • ');
  } else if (isDissectProcessor(processor)) {
    return processor.dissect.pattern;
  }

  return '';
};

export const discardChangesPromptOptions: DiscardPromptOptions = {
  message: i18n.translate('xpack.streams.enrichment.processor.discardChanges.message', {
    defaultMessage: 'Are you sure you want to discard your changes?',
  }),
  title: i18n.translate('xpack.streams.enrichment.processor.discardChanges.title', {
    defaultMessage: 'Discard changes?',
  }),
  confirmButtonText: i18n.translate(
    'xpack.streams.enrichment.processor.discardChanges.confirmButtonText',
    { defaultMessage: 'Discard' }
  ),
  cancelButtonText: i18n.translate(
    'xpack.streams.enrichment.processor.discardChanges.cancelButtonText',
    { defaultMessage: 'Keep editing' }
  ),
};

export const deleteProcessorPromptOptions: DiscardPromptOptions = {
  message: i18n.translate('xpack.streams.enrichment.processor.deleteProcessor.message', {
    defaultMessage: 'Deleting this processor will permanently impact the field configuration.',
  }),
  title: i18n.translate('xpack.streams.enrichment.processor.deleteProcessor.title', {
    defaultMessage: 'Are you sure you want to delete this processor?',
  }),
  confirmButtonText: i18n.translate(
    'xpack.streams.enrichment.processor.deleteProcessor.confirmButtonText',
    { defaultMessage: 'Delete processor' }
  ),
  cancelButtonText: i18n.translate(
    'xpack.streams.enrichment.processor.deleteProcessor.cancelButtonText',
    { defaultMessage: 'Cancel' }
  ),
};
