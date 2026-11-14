/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  useController,
  useFormContext,
  useWatch,
  type ControllerRenderProps,
} from 'react-hook-form';
import { EuiFieldText, EuiFormRow, EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { OtelDataStreamName } from '@kbn/streams-schema';
import { PREFIXED_DESTINATION_SIGNALS, SIGNAL_INDEX_FIELDS } from './destination_models';
import { DESTINATION_SIGNAL_LABELS } from './destination_type_config';
import { DocsIndexField, DocsWritePatternsField } from './docs_target_fields';
import { OtelNameFields, useSetOtelName } from './otel_name_fields';
import {
  EMPTY_ELASTICSEARCH_DESTINATION_FORM,
  EMPTY_STATIC_NAMES,
  type DestinationCreationFormData,
  type DestinationCreationFormErrors,
  type ElasticsearchDestinationFormData,
  type PrefixedDestinationSignal,
  type StaticIndexNaming,
} from './types';
import { getFilledCustomSignals, getSharedOtelNameOnSwitch } from './writing_mode_form';
import {
  NamingButtonGroup,
  SignalFieldsBox,
  SignalPrepend,
  UNNAMED_SIGNALS_HELP,
  WritingModePanel,
} from './writing_mode_panel';
import {
  otelNameErrorText,
  writeTargetErrorText,
  type WriteTargetError,
} from './write_target_error_text';

interface LocalElasticsearchFieldsProps {
  errors: DestinationCreationFormErrors;
  disabled: boolean;
}

type IndexFieldPath = `elasticsearch.${(typeof SIGNAL_INDEX_FIELDS)[PrefixedDestinationSignal]}`;

const getIndexFieldPath = (signal: PrefixedDestinationSignal): IndexFieldPath =>
  `elasticsearch.${SIGNAL_INDEX_FIELDS[signal]}`;

type IndexFields = Record<
  PrefixedDestinationSignal,
  ControllerRenderProps<DestinationCreationFormData, IndexFieldPath>
>;

interface WriteTargetFieldsProps extends LocalElasticsearchFieldsProps {
  elasticsearch: ElasticsearchDestinationFormData;
  indexFields: IndexFields;
  customSignalsField: ControllerRenderProps<
    DestinationCreationFormData,
    'elasticsearch.customSignals'
  >;
  docsIndexField: ControllerRenderProps<DestinationCreationFormData, 'elasticsearch.docsIndex'>;
  docsWritePatternsField: ControllerRenderProps<
    DestinationCreationFormData,
    'elasticsearch.docsWritePatterns'
  >;
  /** Empties the signals and indices of the previous choice, and forgets they were touched. */
  resetWriteTargets: () => void;
}

const SignalWritePatternField = ({
  signal,
  value,
  error,
  disabled,
  onChange,
  onBlur,
}: {
  signal: PrefixedDestinationSignal;
  value: string;
  error: WriteTargetError;
  disabled: boolean;
  onChange: (index: string) => void;
  onBlur: () => void;
}) => {
  const errorText = writeTargetErrorText(signal, error, true);
  return (
    <EuiFormRow fullWidth isInvalid={Boolean(errorText)} error={errorText}>
      <EuiFieldText
        fullWidth
        value={value}
        disabled={disabled}
        isInvalid={Boolean(errorText)}
        prepend={<SignalPrepend label={DESTINATION_SIGNAL_LABELS[signal]} />}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={i18n.translate('xpack.streams.destinations.signalWritePatternPlaceholder', {
          defaultMessage: 'e.g. {signal}-billing-*',
          values: { signal },
        })}
        aria-label={i18n.translate('xpack.streams.destinations.signalWritePatternAriaLabel', {
          defaultMessage: '{signal} write pattern',
          values: { signal: DESTINATION_SIGNAL_LABELS[signal] },
        })}
        data-test-subj={`streamsCreateDestination-${signal}-index`}
      />
    </EuiFormRow>
  );
};

const AutoFields = ({
  elasticsearch,
  errors,
  disabled,
  indexFields,
  customSignalsField,
  docsWritePatternsField,
  resetWriteTargets,
}: WriteTargetFieldsProps) => {
  const { setValue, getValues } = useFormContext<DestinationCreationFormData>();
  const { useCustomWritePatterns } = elasticsearch;

  // A signal is sent when its field is filled, so the signal list follows every edit.
  const syncCustomSignals = () =>
    customSignalsField.onChange(getFilledCustomSignals(getValues('elasticsearch')));
  const touchCustomSignals = () => customSignalsField.onBlur();

  return (
    <>
      <EuiSwitch
        compressed
        label={i18n.translate('xpack.streams.destinations.customIndexNamesSwitchLabel', {
          defaultMessage: 'Use custom index names with * as a wildcard.',
        })}
        checked={useCustomWritePatterns}
        disabled={disabled}
        onChange={(event) => {
          resetWriteTargets();
          setValue('elasticsearch.useCustomWritePatterns', event.target.checked, {
            shouldDirty: true,
          });
        }}
        data-test-subj="streamsCreateDestinationCustomWritePatterns"
      />
      {!useCustomWritePatterns && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate('xpack.streams.destinations.autoDocsHelpDescription', {
                defaultMessage:
                  "Documents from _bulk sources go to the index in each request's _index, which must start with logs-, metrics- or traces-.",
              })}
            </p>
          </EuiText>
        </>
      )}
      {useCustomWritePatterns && (
        <>
          <EuiSpacer size="m" />
          <SignalFieldsBox help={UNNAMED_SIGNALS_HELP}>
            {PREFIXED_DESTINATION_SIGNALS.map((signal) => (
              <React.Fragment key={signal}>
                <SignalWritePatternField
                  signal={signal}
                  value={elasticsearch[SIGNAL_INDEX_FIELDS[signal]]}
                  error={errors[SIGNAL_INDEX_FIELDS[signal]]}
                  disabled={disabled}
                  onChange={(value) => {
                    indexFields[signal].onChange(value);
                    syncCustomSignals();
                  }}
                  onBlur={() => {
                    indexFields[signal].onBlur();
                    touchCustomSignals();
                  }}
                />
                <EuiSpacer size="s" />
              </React.Fragment>
            ))}
            <DocsWritePatternsField
              value={elasticsearch.docsWritePatterns}
              getValue={() => getValues('elasticsearch.docsWritePatterns')}
              error={errors.docsWritePatterns}
              disabled={disabled}
              onChange={(patterns) => {
                docsWritePatternsField.onChange(patterns);
                syncCustomSignals();
              }}
              onBlur={() => {
                docsWritePatternsField.onBlur();
                touchCustomSignals();
              }}
            />
            {errors.customSignals === 'required' && (
              <EuiText size="xs" color="danger">
                <p>
                  {i18n.translate(
                    'xpack.streams.destinations.customSignalsNameRequiredErrorMessage',
                    { defaultMessage: 'Name at least one signal.' }
                  )}
                </p>
              </EuiText>
            )}
          </SignalFieldsBox>
        </>
      )}
    </>
  );
};

const StaticFields = ({
  elasticsearch,
  errors,
  disabled,
  indexFields,
  docsIndexField,
}: WriteTargetFieldsProps) => {
  const { setValue, resetField } = useFormContext<DestinationCreationFormData>();
  const setOtelName = useSetOtelName('elasticsearch');
  const { staticNaming, staticNames } = elasticsearch;
  const requiredError =
    errors.staticIndexes === 'required'
      ? i18n.translate('xpack.streams.destinations.staticIndexRequiredErrorMessage', {
          defaultMessage: 'Enter at least one index.',
        })
      : undefined;

  const setSharedName = (name: OtelDataStreamName) => {
    for (const signal of PREFIXED_DESTINATION_SIGNALS) {
      setOtelName(signal, name);
    }
  };

  const onNamingChange = (naming: StaticIndexNaming) => {
    setValue('elasticsearch.staticNaming', naming, { shouldDirty: true });
    if (naming !== 'shared') {
      return;
    }
    const name = getSharedOtelNameOnSwitch(staticNames);
    if (name) {
      setSharedName(name);
      return;
    }
    setValue('elasticsearch.staticNames', EMPTY_STATIC_NAMES);
    for (const signal of PREFIXED_DESTINATION_SIGNALS) {
      resetField(getIndexFieldPath(signal));
    }
  };

  const sharedError =
    otelNameErrorText(errors.logsIndex) ??
    otelNameErrorText(errors.metricsIndex) ??
    otelNameErrorText(errors.tracesIndex) ??
    requiredError;

  const docsIndexRow = (
    <DocsIndexField
      value={elasticsearch.docsIndex}
      error={errors.docsIndex}
      disabled={disabled}
      onChange={docsIndexField.onChange}
      onBlur={docsIndexField.onBlur}
    />
  );

  return (
    <>
      <NamingButtonGroup naming={staticNaming} disabled={disabled} onChange={onNamingChange} />
      <EuiSpacer size="m" />
      {staticNaming === 'shared' ? (
        <SignalFieldsBox>
          <OtelNameFields
            value={staticNames.logs}
            errorText={sharedError}
            disabled={disabled}
            testSubjPrefix="streamsCreateDestinationIndex"
            onChange={setSharedName}
            onBlur={() => {
              for (const signal of PREFIXED_DESTINATION_SIGNALS) {
                indexFields[signal].onBlur();
              }
            }}
          />
          <EuiSpacer size="s" />
          {docsIndexRow}
        </SignalFieldsBox>
      ) : (
        <SignalFieldsBox
          help={requiredError ?? UNNAMED_SIGNALS_HELP}
          isHelpError={Boolean(requiredError)}
        >
          {PREFIXED_DESTINATION_SIGNALS.map((signal) => (
            <React.Fragment key={signal}>
              <OtelNameFields
                signal={signal}
                value={staticNames[signal]}
                errorText={otelNameErrorText(errors[SIGNAL_INDEX_FIELDS[signal]])}
                disabled={disabled}
                testSubjPrefix={`streamsCreateDestination-${signal}-index`}
                onChange={(name) => setOtelName(signal, name)}
                onBlur={indexFields[signal].onBlur}
              />
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
          {docsIndexRow}
        </SignalFieldsBox>
      )}
    </>
  );
};

/** Fields for a local Elasticsearch destination (`elasticsearch.schema.yaml`). */
export const LocalElasticsearchFields = (props: LocalElasticsearchFieldsProps) => {
  const { disabled } = props;
  const { control, setValue, resetField } = useFormContext<DestinationCreationFormData>();
  const elasticsearch = useWatch({ control, name: 'elasticsearch' });
  // Registered here rather than in the inputs, so `resetField` also clears hidden ones.
  const indexFields: IndexFields = {
    logs: useController({ control, name: getIndexFieldPath('logs') }).field,
    metrics: useController({ control, name: getIndexFieldPath('metrics') }).field,
    traces: useController({ control, name: getIndexFieldPath('traces') }).field,
  };
  const { field: customSignalsField } = useController({
    control,
    name: 'elasticsearch.customSignals',
  });
  const { field: docsIndexField } = useController({ control, name: 'elasticsearch.docsIndex' });
  const { field: docsWritePatternsField } = useController({
    control,
    name: 'elasticsearch.docsWritePatterns',
  });

  const resetWriteTargets = () => {
    resetField('elasticsearch.customSignals');
    for (const signal of PREFIXED_DESTINATION_SIGNALS) {
      resetField(getIndexFieldPath(signal));
    }
    resetField('elasticsearch.docsIndex');
    resetField('elasticsearch.docsWritePatterns');
    // No input registers the name parts, so `resetField` would skip them.
    setValue('elasticsearch.staticNames', EMPTY_STATIC_NAMES);
  };

  const onModeChange = (auto: boolean) => {
    if (auto === elasticsearch.auto) {
      return;
    }
    resetWriteTargets();
    // `resetField` skips fields no input registers, so these two are set directly.
    setValue(
      'elasticsearch.useCustomWritePatterns',
      EMPTY_ELASTICSEARCH_DESTINATION_FORM.useCustomWritePatterns
    );
    setValue('elasticsearch.staticNaming', EMPTY_ELASTICSEARCH_DESTINATION_FORM.staticNaming);
    setValue('elasticsearch.auto', auto, { shouldDirty: true });
  };

  const writeTargetFieldsProps: WriteTargetFieldsProps = {
    ...props,
    elasticsearch,
    indexFields,
    customSignalsField,
    docsIndexField,
    docsWritePatternsField,
    resetWriteTargets,
  };

  return (
    <WritingModePanel
      auto={elasticsearch.auto}
      disabled={disabled}
      radioName="streamsCreateDestinationRouting"
      onModeChange={onModeChange}
    >
      {elasticsearch.auto ? (
        <AutoFields {...writeTargetFieldsProps} />
      ) : (
        <StaticFields {...writeTargetFieldsProps} />
      )}
    </WritingModePanel>
  );
};
