/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DraggableProvidedDragHandleProps,
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
import React, { useEffect, useMemo, useCallback } from 'react';
import { useForm, SubmitHandler, FormProvider, useWatch, DeepPartial } from 'react-hook-form';
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
  isDateProcessor,
  SPECIALISED_TYPES,
} from '../utils';
import { ProcessorErrors, ProcessorMetricBadges } from './processor_metrics';
import {
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
  useSimulatorSelector,
  StreamEnrichmentContextType,
  useGetStreamEnrichmentState,
} from '../state_management/stream_enrichment_state_machine';
import { ProcessorMetrics } from '../state_management/simulation_state_machine';
import { DateProcessorForm } from './date';
import { ConfigDrivenProcessorFields } from './config_driven/components/fields';
import { ConfigDrivenProcessorType } from './config_driven/types';
import { selectPreviewRecords } from '../state_management/simulation_state_machine/selectors';
import { ManualIngestPipelineProcessorForm } from './manual_ingest_pipeline';

export function AddProcessorPanel() {
  const { euiTheme } = useEuiTheme();

  const { addProcessor } = useStreamEnrichmentEvents();

  const processorRef = useStreamEnrichmentSelector((state) =>
    state.context.processorsRefs.find((p) => p.getSnapshot().matches('draft'))
  );
  const processorMetrics = useSimulatorSelector(
    (state) => processorRef && state.context.simulation?.processors_metrics[processorRef.id]
  );
  const getEnrichmentState = useGetStreamEnrichmentState();

  const grokCollection = useStreamEnrichmentSelector((state) => state.context.grokCollection);

  const isOpen = Boolean(processorRef);
  const defaultValuesGetter = useCallback(
    () =>
      getDefaultFormStateByType(
        'grok',
        selectPreviewRecords(getEnrichmentState().context.simulatorRef?.getSnapshot().context),
        { grokCollection }
      ),
    [getEnrichmentState, grokCollection]
  );
  const initialDefaultValues = useMemo(() => defaultValuesGetter(), [defaultValuesGetter]);

  const methods = useForm<ProcessorFormState>({
    // cast necessary because DeepPartial does not work with `unknown`
    defaultValues: initialDefaultValues as DeepPartial<ProcessorFormState>,
    mode: 'onChange',
  });

  const type = useWatch({ control: methods.control, name: 'type' });

  useEffect(() => {
    if (!processorRef) {
      methods.reset(defaultValuesGetter());
    }
  }, [defaultValuesGetter, methods, processorRef]);

  useEffect(() => {
    if (processorRef) {
      const { unsubscribe } = methods.watch((value) => {
        const { processorDefinition, processorResources } = convertFormStateToProcessor(
          value as ProcessorFormState
        );
        processorRef.send({
          type: 'processor.change',
          processor: processorDefinition,
          resources: processorResources,
        });
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
    const defaultValues = defaultValuesGetter();
    methods.reset(defaultValues);
    const draftProcessor = createDraftProcessorFromForm(defaultValues);
    addProcessor(draftProcessor);
  };

  if (!isOpen) {
    return (
      <EuiPanel
        hasBorder
        css={css`
          border: ${euiTheme.border.thin};
          box-shadow: none !important; // override default EuiPanel shadow on hover
          transform: none !important; // override default EuiPanel transform on hover
        `}
        onClick={handleOpen}
        type="button"
        paddingSize="m"
      >
        <EuiPanel hasShadow={false} color="transparent" paddingSize="xs">
          <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
            <EuiIcon type="plus" />
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.addProcessorAction',
              { defaultMessage: 'Add a processor' }
            )}
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel
      color={isOpen ? 'subdued' : undefined}
      hasBorder
      css={css`
        border: ${euiTheme.border.thin};
        padding: ${euiTheme.size.m};
      `}
      type="button"
    >
      <EuiAccordion
        id="add-processor-accordion"
        arrowDisplay="none"
        buttonContent={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorPanel.addingProcessor',
          { defaultMessage: 'Adding processor' }
        )}
        forceState="open"
        extraAction={
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
            {type === 'manual_ingest_pipeline' && <ManualIngestPipelineProcessorForm />}
            {!SPECIALISED_TYPES.includes(type) && (
              <ConfigDrivenProcessorFields type={type as ConfigDrivenProcessorType} />
            )}
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
  const { processorDefinition } = convertFormStateToProcessor(formState);

  return {
    id: 'draft',
    type: formState.type,
    ...processorDefinition,
  };
};

export interface EditProcessorPanelProps {
  dragHandleProps: DraggableProvidedDragHandleProps | null;
  processorRef: StreamEnrichmentContextType['processorsRefs'][number];
  processorMetrics?: ProcessorMetrics;
}

export function EditProcessorPanel({
  dragHandleProps,
  processorRef,
  processorMetrics,
}: EditProcessorPanelProps) {
  const { euiTheme } = useEuiTheme();
  const state = useSelector(processorRef, (s) => s);
  const getEnrichmentState = useGetStreamEnrichmentState();

  const canEdit = useStreamEnrichmentSelector((s) => s.context.definition.privileges.simulate);
  const grokCollection = useStreamEnrichmentSelector((_state) => _state.context.grokCollection);
  const previousProcessor = state.context.previousProcessor;
  const processor = state.context.processor;

  const processorDescription = getProcessorDescription(processor);

  const isOpen = state.matches({ configured: 'edit' });
  const isNew = state.context.isNew;
  const isUnsaved = isNew || state.context.isUpdated;

  const defaultValues = useMemo(
    () =>
      getFormStateFrom(
        selectPreviewRecords(getEnrichmentState().context.simulatorRef?.getSnapshot().context),
        { grokCollection },
        processor
      ),
    [getEnrichmentState, grokCollection, processor]
  );

  const methods = useForm<ProcessorFormState>({
    defaultValues: defaultValues as DeepPartial<ProcessorFormState>,
    mode: 'onChange',
  });

  const type = useWatch({ control: methods.control, name: 'type' });

  useEffect(() => {
    const { unsubscribe } = methods.watch((value) => {
      const { processorDefinition, processorResources } = convertFormStateToProcessor(
        value as ProcessorFormState
      );
      processorRef.send({
        type: 'processor.change',
        processor: processorDefinition,
        resources: processorResources,
      });
    });
    return () => unsubscribe();
  }, [methods, processorRef]);

  useEffect(() => {
    const subscription = processorRef.on('processor.changesDiscarded', () => {
      methods.reset(
        getFormStateFrom(
          selectPreviewRecords(getEnrichmentState().context.simulatorRef?.getSnapshot().context),
          { grokCollection },
          previousProcessor
        )
      );
    });

    return () => subscription.unsubscribe();
  }, [getEnrichmentState, grokCollection, methods, previousProcessor, processorRef]);

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
      <EuiPanel hasShadow={false} color="transparent" paddingSize="xs" {...dragHandleProps}>
        <EuiIcon type="grab" />
      </EuiPanel>
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
                disabled={!canEdit}
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
            {type === 'manual_ingest_pipeline' && <ManualIngestPipelineProcessorForm />}
            {!SPECIALISED_TYPES.includes(type) && (
              <ConfigDrivenProcessorFields type={type as ConfigDrivenProcessorType} />
            )}
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
  } else if (isDateProcessor(processor)) {
    return `${processor.date.field} • ${processor.date.formats.join(' - ')}`;
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
