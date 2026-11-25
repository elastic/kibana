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
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { OtelDataStreamName } from '@kbn/streams-schema';
import { PREFIXED_DESTINATION_SIGNALS, SIGNAL_INDEX_FIELDS } from './destination_models';
import { DocsIndexField } from './docs_target_fields';
import { OtelNameFields, useSetOtelName } from './otel_name_fields';
import {
  EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM,
  EMPTY_STATIC_NAMES,
  type DestinationCreationFormData,
  type DestinationCreationFormErrors,
  type PrefixedDestinationSignal,
  type StaticIndexNaming,
} from './types';
import { getSharedOtelNameOnSwitch } from './writing_mode_form';
import {
  NamingButtonGroup,
  SignalFieldsBox,
  UNNAMED_SIGNALS_HELP,
  WritingModePanel,
} from './writing_mode_panel';
import { otelNameErrorText } from './write_target_error_text';

type IndexFieldPath =
  `remoteElasticsearch.${(typeof SIGNAL_INDEX_FIELDS)[PrefixedDestinationSignal]}`;

type IndexFields = Record<
  PrefixedDestinationSignal,
  ControllerRenderProps<DestinationCreationFormData, IndexFieldPath>
>;

type DocsIndexFieldProps = ControllerRenderProps<
  DestinationCreationFormData,
  'remoteElasticsearch.docsIndex'
>;

interface RemoteElasticsearchRoutingFieldsProps {
  errors: DestinationCreationFormErrors;
  disabled: boolean;
}

const getIndexFieldPath = (signal: PrefixedDestinationSignal): IndexFieldPath =>
  `remoteElasticsearch.${SIGNAL_INDEX_FIELDS[signal]}`;

const StaticFields = ({
  errors,
  disabled,
  indexFields,
  docsIndexField,
}: RemoteElasticsearchRoutingFieldsProps & {
  indexFields: IndexFields;
  docsIndexField: DocsIndexFieldProps;
}) => {
  const { control, setValue, resetField } = useFormContext<DestinationCreationFormData>();
  const setOtelName = useSetOtelName('remoteElasticsearch');
  const staticNaming = useWatch({ control, name: 'remoteElasticsearch.staticNaming' });
  const staticNames = useWatch({ control, name: 'remoteElasticsearch.staticNames' });
  const requiredError =
    errors.staticIndexes === 'required'
      ? i18n.translate('xpack.streams.destinations.remoteElasticsearch.indexRequiredErrorMessage', {
          defaultMessage: 'Enter at least one index.',
        })
      : undefined;

  const setSharedName = (name: OtelDataStreamName) => {
    for (const signal of PREFIXED_DESTINATION_SIGNALS) {
      setOtelName(signal, name);
    }
  };

  const onNamingChange = (naming: StaticIndexNaming) => {
    setValue('remoteElasticsearch.staticNaming', naming, { shouldDirty: true });
    if (naming !== 'shared') {
      return;
    }
    const name = getSharedOtelNameOnSwitch(staticNames);
    if (name) {
      setSharedName(name);
      return;
    }
    setValue('remoteElasticsearch.staticNames', EMPTY_STATIC_NAMES);
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
      value={docsIndexField.value}
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

export const RemoteElasticsearchRoutingFields = (props: RemoteElasticsearchRoutingFieldsProps) => {
  const { disabled } = props;
  const { control, setValue, resetField } = useFormContext<DestinationCreationFormData>();
  const auto = useWatch({ control, name: 'remoteElasticsearch.auto' });
  // Registered here rather than in the inputs, so `resetField` also clears hidden ones.
  const indexFields: IndexFields = {
    logs: useController({ control, name: getIndexFieldPath('logs') }).field,
    metrics: useController({ control, name: getIndexFieldPath('metrics') }).field,
    traces: useController({ control, name: getIndexFieldPath('traces') }).field,
  };
  const { field: docsIndexField } = useController({
    control,
    name: 'remoteElasticsearch.docsIndex',
  });
  const onModeChange = (nextAuto: boolean) => {
    if (nextAuto === auto) {
      return;
    }
    for (const signal of PREFIXED_DESTINATION_SIGNALS) {
      resetField(getIndexFieldPath(signal));
    }
    resetField('remoteElasticsearch.docsIndex');
    // `resetField` skips unregistered paths, and naming and name parts are only set with `setValue`.
    setValue(
      'remoteElasticsearch.staticNaming',
      EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM.staticNaming
    );
    setValue('remoteElasticsearch.staticNames', EMPTY_STATIC_NAMES);
    setValue('remoteElasticsearch.auto', nextAuto, { shouldDirty: true });
  };

  return (
    <WritingModePanel
      auto={auto}
      disabled={disabled}
      radioName="streamsCreateDestinationRemoteRouting"
      onModeChange={onModeChange}
    >
      {!auto && (
        <StaticFields {...props} indexFields={indexFields} docsIndexField={docsIndexField} />
      )}
    </WritingModePanel>
  );
};
