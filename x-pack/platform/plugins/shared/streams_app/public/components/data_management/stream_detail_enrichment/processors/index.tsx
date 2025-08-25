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
  EuiText,
  EuiBadge,
  EuiFlexItem,
} from '@elastic/eui';
import { useSelector } from '@xstate5/react';
import { i18n } from '@kbn/i18n';
import { isEmpty, isEqual } from 'lodash';
import type { PropsWithChildren } from 'react';
import React, { useEffect, useState } from 'react';
import type { SubmitHandler, DeepPartial } from 'react-hook-form';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { css } from '@emotion/react';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import type { StreamlangStepWithUIAttributesWithCustomIdentifier } from '@kbn/streamlang';
import { useKibana } from '../../../../hooks/use_kibana';
import type { DiscardPromptOptions } from '../../../../hooks/use_discard_confirm';
import { useDiscardConfirm } from '../../../../hooks/use_discard_confirm';
import { DissectProcessorForm } from './dissect';
import { GrokProcessorForm } from './grok';
import { ProcessorTypeSelector } from './processor_type_selector';
import type { ProcessorFormState } from '../types';
import { getFormStateFrom, convertFormStateToProcessor, SPECIALISED_TYPES } from '../utils';
import { ProcessorErrors, ProcessorMetricBadges } from './processor_metrics';
import type { StreamEnrichmentContextType } from '../state_management/stream_enrichment_state_machine';
import {
  useStreamEnrichmentSelector,
  useGetStreamEnrichmentState,
} from '../state_management/stream_enrichment_state_machine';
import { DateProcessorForm } from './date';
import { ConfigDrivenProcessorFields } from './config_driven/components/fields';
import type { ConfigDrivenProcessorType } from './config_driven/types';
import { selectPreviewRecords } from '../state_management/simulation_state_machine/selectors';
import { ManualIngestPipelineProcessorForm } from './manual_ingest_pipeline';
import { isProcessorUnderEdit } from '../state_management/steps_state_machine';
import { SetProcessorForm } from './set';

export interface StepConfigurationProps {
  stepRef: StreamEnrichmentContextType['stepRefs'][number];
}

export function ActionConfiguration({ stepRef, processorMetrics }: StepConfigurationProps) {
  const isOpen = useSelector(stepRef, isProcessorUnderEdit);

  if (!isOpen) {
    return <StepConfigurationListItem processorMetrics={processorMetrics} stepRef={stepRef} />;
  }

  return <StepConfigurationEditor processorMetrics={processorMetrics} stepRef={stepRef} />;
}

const StepConfigurationListItem = ({ processorMetrics, stepRef }: StepConfigurationProps) => {
  const canEdit = useStreamEnrichmentSelector((snapshot) => snapshot.can({ type: 'step.edit' }));
  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);

  const isUnsaved = useSelector(
    stepRef,
    (snapshot) => snapshot.context.isNew || snapshot.context.isUpdated
  );

  const stepDescription = getStepDescription(step);

  const handleOpen = () => {
    stepRef.send({ type: 'step.edit' });
  };

  return (
    <ProcessorPanel>
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
        <strong data-test-subj="streamsAppProcessorLegend">{step.action?.toUpperCase()}</strong>
        <EuiText component="span" size="s" color="subdued" className="eui-textTruncate">
          {stepDescription}
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
                { defaultMessage: 'Edit {type} processor', values: { type: step.action } }
              )}
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ProcessorPanel>
  );
};

const StepConfigurationEditor = ({ processorMetrics, stepRef }: StepConfigurationProps) => {
  const { appParams, core } = useKibana();

  const getEnrichmentState = useGetStreamEnrichmentState();

  const grokCollection = useStreamEnrichmentSelector((snapshot) => snapshot.context.grokCollection);

  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);

  const [defaultValues] = useState(() =>
    getFormStateFrom(
      selectPreviewRecords(getEnrichmentState().context.simulatorRef.getSnapshot().context),
      { grokCollection },
      step
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

  return (
    <ProcessorPanel>
      <EuiAccordion
        id="processor-accordion"
        arrowProps={{
          css: { display: 'none' },
        }}
        buttonContent={<strong>{step.action.toUpperCase()}</strong>}
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
            {type === 'set' && <SetProcessorForm />}
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
      data-test-subj="streamsAppProcessorConfigurationListItem"
      css={css`
        border: ${euiTheme.border.thin};
        padding: ${euiTheme.size.m};
      `}
      {...props}
    />
  );
};

const getStepDescription = (step: StreamlangStepWithUIAttributesWithCustomIdentifier) => {
  if ('action' in step) {
    if (step.action === 'grok') {
      return step.patterns.join(' • ');
    } else if (step.action === 'dissect') {
      return step.pattern;
    } else if (step.action === 'date') {
      return `${step.from} • ${step.formats.join(' - ')}`;
    }
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
