/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  useController,
  useFormContext,
  useWatch,
  type ControllerRenderProps,
} from 'react-hook-form';
import { EuiFieldText, EuiFormRow, EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  PREFIXED_DESTINATION_SIGNALS,
  composeStaticIndexesForAll,
  SIGNAL_INDEX_FIELDS,
} from './destination_models';
import { DESTINATION_SIGNAL_LABELS } from './destination_type_config';
import { DocsIndexField, DocsWritePatternsField } from './docs_target_fields';
import {
  EMPTY_ELASTICSEARCH_DESTINATION_FORM,
  type DestinationCreationFormData,
  type DestinationCreationFormErrors,
  type ElasticsearchDestinationFormData,
  type PrefixedDestinationSignal,
  type StaticIndexNaming,
} from './types';
import {
  getFilledCustomSignals,
  getSharedIndexInput,
  getSharedRemainderOnSwitch,
} from './writing_mode_form';
import {
  INDEX_NAME_PREPEND,
  NamingButtonGroup,
  SignalFieldsBox,
  SignalPrepend,
  UNNAMED_SIGNALS_HELP,
  WritingModePanel,
} from './writing_mode_panel';
import { writeTargetErrorText, type WriteTargetError } from './write_target_error_text';

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

const DOCS_PREPEND = <SignalPrepend label={DESTINATION_SIGNAL_LABELS.docs} />;

const SignalIndexField = ({
  signal,
  value,
  error,
  allowWildcard,
  disabled,
  onChange,
  onBlur,
}: {
  signal: PrefixedDestinationSignal;
  value: string;
  error: WriteTargetError;
  allowWildcard: boolean;
  disabled: boolean;
  onChange: (index: string) => void;
  onBlur: () => void;
}) => {
  const errorText = writeTargetErrorText(signal, error, allowWildcard);
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
        placeholder={
          allowWildcard
            ? i18n.translate('xpack.streams.destinations.signalWritePatternPlaceholder', {
                defaultMessage: 'e.g. {signal}-billing-*',
                values: { signal },
              })
            : i18n.translate('xpack.streams.destinations.perSignalIndexPlaceholder', {
                defaultMessage: 'e.g. {signal}-billing-default',
                values: { signal },
              })
        }
        aria-label={
          allowWildcard
            ? i18n.translate('xpack.streams.destinations.signalWritePatternAriaLabel', {
                defaultMessage: '{signal} write pattern',
                values: { signal: DESTINATION_SIGNAL_LABELS[signal] },
              })
            : i18n.translate('xpack.streams.destinations.signalIndexAriaLabel', {
                defaultMessage: '{signal} index name',
                values: { signal: DESTINATION_SIGNAL_LABELS[signal] },
              })
        }
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
                <SignalIndexField
                  signal={signal}
                  value={elasticsearch[SIGNAL_INDEX_FIELDS[signal]]}
                  error={errors[SIGNAL_INDEX_FIELDS[signal]]}
                  allowWildcard
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
  const { staticNaming, logsIndex, metricsIndex, tracesIndex } = elasticsearch;
  const requiredError =
    errors.staticIndexes === 'required'
      ? i18n.translate('xpack.streams.destinations.staticIndexRequiredErrorMessage', {
          defaultMessage: 'Enter at least one index.',
        })
      : undefined;

  // Composition keeps a prefix the user typed, so the remainder alone would hide part of the input.
  const [typedSharedIndex, setTypedSharedIndex] = useState('');
  const composedTyped = composeStaticIndexesForAll(typedSharedIndex);
  const sharedIndexValue =
    composedTyped.logsIndex === logsIndex &&
    composedTyped.metricsIndex === metricsIndex &&
    composedTyped.tracesIndex === tracesIndex
      ? typedSharedIndex
      : getSharedIndexInput(elasticsearch);
  const hasSignalPrefix = PREFIXED_DESTINATION_SIGNALS.some((signal) =>
    sharedIndexValue.trim().startsWith(`${signal}-`)
  );

  const setSharedIndex = (remainder: string) => {
    setTypedSharedIndex(remainder);
    const indexes = composeStaticIndexesForAll(remainder);
    for (const signal of PREFIXED_DESTINATION_SIGNALS) {
      indexFields[signal].onChange(indexes[SIGNAL_INDEX_FIELDS[signal]]);
    }
  };

  const onNamingChange = (naming: StaticIndexNaming) => {
    setValue('elasticsearch.staticNaming', naming, { shouldDirty: true });
    if (naming !== 'shared') {
      return;
    }
    const remainder = getSharedRemainderOnSwitch(elasticsearch);
    if (remainder) {
      setSharedIndex(remainder);
      return;
    }
    for (const signal of PREFIXED_DESTINATION_SIGNALS) {
      resetField(getIndexFieldPath(signal));
    }
  };

  const signalPrefixError =
    hasSignalPrefix && (errors.logsIndex || errors.metricsIndex || errors.tracesIndex)
      ? i18n.translate('xpack.streams.destinations.sharedIndexSignalPrefixErrorMessage', {
          defaultMessage: 'Enter the name without the logs-, metrics- or traces- prefix.',
        })
      : undefined;

  const sharedError =
    signalPrefixError ??
    writeTargetErrorText('logs', errors.logsIndex, false) ??
    writeTargetErrorText('metrics', errors.metricsIndex, false) ??
    writeTargetErrorText('traces', errors.tracesIndex, false) ??
    requiredError;

  const hasSharedIndex = Boolean(logsIndex);

  const docsIndexRow = (
    <DocsIndexField
      value={elasticsearch.docsIndex}
      error={errors.docsIndex}
      disabled={disabled}
      onChange={docsIndexField.onChange}
      onBlur={docsIndexField.onBlur}
      prepend={DOCS_PREPEND}
    />
  );

  return (
    <>
      <NamingButtonGroup naming={staticNaming} disabled={disabled} onChange={onNamingChange} />
      <EuiSpacer size="m" />
      {staticNaming === 'shared' ? (
        <SignalFieldsBox>
          <EuiFormRow
            fullWidth
            helpText={
              sharedError
                ? undefined
                : i18n.translate('xpack.streams.destinations.sharedIndexSavedAsHelp', {
                    defaultMessage: 'Saved as {logs}, {metrics} and {traces}.',
                    values: {
                      logs: hasSharedIndex ? logsIndex : 'logs-<name>',
                      metrics: hasSharedIndex ? metricsIndex : 'metrics-<name>',
                      traces: hasSharedIndex ? tracesIndex : 'traces-<name>',
                    },
                  })
            }
            isInvalid={Boolean(sharedError)}
            error={sharedError}
          >
            <EuiFieldText
              fullWidth
              value={sharedIndexValue}
              disabled={disabled}
              isInvalid={Boolean(sharedError)}
              prepend={<SignalPrepend label={INDEX_NAME_PREPEND} />}
              onChange={(event) => setSharedIndex(event.target.value)}
              onBlur={() => {
                for (const signal of PREFIXED_DESTINATION_SIGNALS) {
                  indexFields[signal].onBlur();
                }
              }}
              placeholder={i18n.translate('xpack.streams.destinations.sharedIndexPlaceholder', {
                defaultMessage: 'e.g. billing-default',
              })}
              aria-label={i18n.translate('xpack.streams.destinations.sharedIndexAriaLabel', {
                defaultMessage: 'Index name for all OTel signals',
              })}
              data-test-subj="streamsCreateDestinationIndex"
            />
          </EuiFormRow>
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
              <SignalIndexField
                signal={signal}
                value={elasticsearch[SIGNAL_INDEX_FIELDS[signal]]}
                error={errors[SIGNAL_INDEX_FIELDS[signal]]}
                allowWildcard={false}
                disabled={disabled}
                onChange={indexFields[signal].onChange}
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
