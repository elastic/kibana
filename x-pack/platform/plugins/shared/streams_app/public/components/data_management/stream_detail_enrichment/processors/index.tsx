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
  EuiFlexItem,
} from '@elastic/eui';
import { useSelector } from '@xstate5/react';
import { i18n } from '@kbn/i18n';
import { isEmpty, isEqual } from 'lodash';
import React, { PropsWithChildren, useEffect, useState } from 'react';
import { useForm, SubmitHandler, FormProvider, useWatch, DeepPartial } from 'react-hook-form';
import { css } from '@emotion/react';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { useKibana } from '../../../../hooks/use_kibana';
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
  isDateProcessor,
  SPECIALISED_TYPES,
} from '../utils';
import { ProcessorErrors, ProcessorMetricBadges } from './processor_metrics';
import {
  useStreamEnrichmentSelector,
  StreamEnrichmentContextType,
  useGetStreamEnrichmentState,
} from '../state_management/stream_enrichment_state_machine';
import { ProcessorMetrics } from '../state_management/simulation_state_machine';
import { DateProcessorForm } from './date';
import { ConfigDrivenProcessorFields } from './config_driven/components/fields';
import { ConfigDrivenProcessorType } from './config_driven/types';
import { selectPreviewRecords } from '../state_management/simulation_state_machine/selectors';
import { ManualIngestPipelineProcessorForm } from './manual_ingest_pipeline';

export interface ProcessorConfigurationProps {
  dragHandleProps: DraggableProvidedDragHandleProps | null;
  processorRef: StreamEnrichmentContextType['processorsRefs'][number];
  processorMetrics?: ProcessorMetrics;
}

export function ProcessorConfiguration({
  dragHandleProps,
  processorRef,
  processorMetrics,
}: ProcessorConfigurationProps) {
  const isOpen = useSelector(
    processorRef,
    (snapshot) => snapshot.matches('draft') || snapshot.matches({ configured: 'editing' })
  );

  if (!isOpen) {
    return (
      <ProcessorConfigurationListItem
        dragHandleProps={dragHandleProps}
        processorMetrics={processorMetrics}
        processorRef={processorRef}
      />
    );
  }

  return (
    <ProcessorConfigurationEditor processorMetrics={processorMetrics} processorRef={processorRef} />
  );
}

const ProcessorConfigurationListItem = ({
  dragHandleProps,
  processorMetrics,
  processorRef,
}: ProcessorConfigurationProps) => {
  const canEdit = useStreamEnrichmentSelector((snapshot) =>
    snapshot.can({ type: 'processor.edit' })
  );
  const processor = useSelector(processorRef, (snapshot) => snapshot.context.processor);

  const isConfigured = useSelector(processorRef, (snapshot) => snapshot.matches('configured'));
  const isUnsaved = useSelector(
    processorRef,
    (snapshot) => snapshot.context.isNew || snapshot.context.isUpdated
  );
  const canDragAndDrop = isConfigured && dragHandleProps;

  const processorDescription = getProcessorDescription(processor);

  const handleOpen = () => {
    processorRef.send({ type: 'processor.edit' });
  };

  return (
    <ProcessorPanel>
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
        {canDragAndDrop && (
          <EuiPanel
            grow={false}
            hasShadow={false}
            color="transparent"
            paddingSize="none"
            {...dragHandleProps}
          >
            <EuiIcon type="grab" size="m" />
          </EuiPanel>
        )}
        <strong>{processor.type.toUpperCase()}</strong>
        <EuiText component="span" size="s" color="subdued" className="eui-textTruncate">
          {processorDescription}
        </EuiText>
        <EuiFlexItem grow={1} />
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            {processorMetrics && <ProcessorMetricBadges {...processorMetrics} />}
            {isUnsaved && (
              <EuiBadge>
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.ProcessorConfiguration.unsavedBadge',
                  { defaultMessage: 'Unsaved' }
                )}
              </EuiBadge>
            )}
            <EuiButtonIcon
              data-test-subj="streamsAppProcessorConfigurationButton"
              onClick={handleOpen}
              iconType="pencil"
              disabled={!canEdit}
              color="text"
              size="xs"
              aria-label={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.ProcessorAction',
                { defaultMessage: 'Edit {type} processor', values: { type: processor.type } }
              )}
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ProcessorPanel>
  );
};

const ProcessorConfigurationEditor = ({
  processorMetrics,
  processorRef,
}: Omit<ProcessorConfigurationProps, 'dragHandleProps'>) => {
  const { appParams, core } = useKibana();

  const getEnrichmentState = useGetStreamEnrichmentState();

  const grokCollection = useStreamEnrichmentSelector((snapshot) => snapshot.context.grokCollection);

  const processor = useSelector(processorRef, (snapshot) => snapshot.context.processor);

  const [defaultValues] = useState(() =>
    getFormStateFrom(
      selectPreviewRecords(getEnrichmentState().context.simulatorRef?.getSnapshot().context),
      { grokCollection },
      processor
    )
  );

  const methods = useForm<ProcessorFormState>({
    defaultValues: defaultValues as DeepPartial<ProcessorFormState>,
    mode: 'onChange',
  });

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

  const isConfigured = useSelector(processorRef, (snapshot) => snapshot.matches('configured'));
  const canDelete = useSelector(processorRef, (snapshot) =>
    snapshot.can({ type: 'processor.delete' })
  );
  const canSave = useSelector(processorRef, (snapshot) => snapshot.can({ type: 'processor.save' }));

  const hasStreamChanges = useStreamEnrichmentSelector((state) =>
    state.can({ type: 'stream.reset' })
  );
  const hasProcessorChanges = useSelector(
    processorRef,
    (snapshot) => !isEqual(snapshot.context.previousProcessor, snapshot.context.processor)
  );

  const type = useWatch({ control: methods.control, name: 'type' });

  useUnsavedChangesPrompt({
    hasUnsavedChanges: hasStreamChanges || hasProcessorChanges,
    history: appParams.history,
    http: core.http,
    navigateToUrl: core.application.navigateToUrl,
    openConfirm: core.overlays.openConfirm,
    shouldPromptOnReplace: false,
  });

  const handleCancel = useDiscardConfirm(() => processorRef.send({ type: 'processor.cancel' }), {
    enabled: hasProcessorChanges,
    ...discardChangesPromptOptions,
  });

  const handleDelete = useDiscardConfirm(() => processorRef.send({ type: 'processor.delete' }), {
    enabled: canDelete,
    ...deleteProcessorPromptOptions,
  });

  const handleSubmit: SubmitHandler<ProcessorFormState> = () => {
    processorRef.send({ type: 'processor.save' });
  };

  return (
    <ProcessorPanel>
      <EuiAccordion
        id="processor-accordion"
        arrowProps={{
          css: { display: 'none' },
        }}
        buttonContent={<strong>{processor.type.toUpperCase()}</strong>}
        buttonElement="legend"
        buttonProps={{
          css: css`
            &:hover {
              text-decoration: none;
            }
          `,
        }}
        forceState="open"
        extraAction={
          <EuiFlexGroup alignItems="center" gutterSize="s">
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
                    { defaultMessage: 'Update processor' }
                  )
                : i18n.translate(
                    'xpack.streams.streamDetailView.managementTab.enrichment.ProcessorConfiguration.confirmCreateProcessor',
                    { defaultMessage: 'Create processor' }
                  )}
            </EuiButton>
          </EuiFlexGroup>
        }
      >
        <EuiSpacer size="s" />
        <FormProvider {...methods}>
          {processorMetrics && (
            <>
              <ProcessorMetricBadges {...processorMetrics} />
              <EuiSpacer size="m" />
            </>
          )}
          <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
            <ProcessorTypeSelector disabled={isConfigured} />
            <EuiSpacer size="m" />
            {type === 'date' && <DateProcessorForm />}
            {type === 'grok' && <GrokProcessorForm />}
            {type === 'dissect' && <DissectProcessorForm />}
            {type === 'manual_ingest_pipeline' && <ManualIngestPipelineProcessorForm />}
            {!SPECIALISED_TYPES.includes(type) && (
              <ConfigDrivenProcessorFields type={type as ConfigDrivenProcessorType} />
            )}
          </EuiForm>
          {canDelete && (
            <>
              <EuiHorizontalRule margin="m" />
              <EuiButton
                data-test-subj="streamsAppProcessorConfigurationButton"
                color="danger"
                onClick={handleDelete}
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.deleteProcessorLabel',
                  { defaultMessage: 'Delete processor' }
                )}
              </EuiButton>
            </>
          )}
          {processorMetrics && !isEmpty(processorMetrics.errors) && (
            <ProcessorErrors metrics={processorMetrics} />
          )}
        </FormProvider>
      </EuiAccordion>
    </ProcessorPanel>
  );
};

const ProcessorPanel = (props: PropsWithChildren) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      css={css`
        border: ${euiTheme.border.thin};
        padding: ${euiTheme.size.m};
      `}
      {...props}
    />
  );
};

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
