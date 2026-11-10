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
import { EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PREFIXED_DESTINATION_SIGNALS, SIGNAL_INDEX_FIELDS } from './destination_models';
import { DESTINATION_SIGNAL_LABELS } from './destination_type_config';
import {
  EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM,
  type DestinationCreationFormData,
  type DestinationCreationFormErrors,
  type PrefixedDestinationSignal,
  type StaticIndexNaming,
} from './types';
import { getSharedRemoteIndexOnSwitch } from './writing_mode_form';
import {
  INDEX_NAME_PREPEND,
  NamingButtonGroup,
  SignalFieldsBox,
  SignalPrepend,
  UNNAMED_SIGNALS_HELP,
  WritingModePanel,
} from './writing_mode_panel';

type IndexFieldPath =
  `remoteElasticsearch.${(typeof SIGNAL_INDEX_FIELDS)[PrefixedDestinationSignal]}`;

type IndexFields = Record<
  PrefixedDestinationSignal,
  ControllerRenderProps<DestinationCreationFormData, IndexFieldPath>
>;

type IndexError = DestinationCreationFormErrors['logsIndex'];

interface RemoteElasticsearchRoutingFieldsProps {
  errors: DestinationCreationFormErrors;
  disabled: boolean;
}

const getIndexFieldPath = (signal: PrefixedDestinationSignal): IndexFieldPath =>
  `remoteElasticsearch.${SIGNAL_INDEX_FIELDS[signal]}`;

const indexErrorText = (error: IndexError): string | undefined => {
  switch (error) {
    case 'template':
      return i18n.translate(
        'xpack.streams.destinations.remoteElasticsearch.indexTemplateErrorMessage',
        { defaultMessage: 'Templated index names are not supported yet.' }
      );
    case 'uppercase':
      return i18n.translate(
        'xpack.streams.destinations.remoteElasticsearch.indexUppercaseErrorMessage',
        { defaultMessage: 'Index names must be lowercase.' }
      );
    case 'invalidCharacter':
      return i18n.translate(
        'xpack.streams.destinations.remoteElasticsearch.indexInvalidCharacterErrorMessage',
        {
          defaultMessage:
            'Index names cannot contain \\ / * ? " < > | , # :, whitespace, or control characters.',
        }
      );
    case 'invalidName':
      return i18n.translate(
        'xpack.streams.destinations.remoteElasticsearch.indexInvalidNameErrorMessage',
        { defaultMessage: 'Enter a valid index name.' }
      );
    default:
      return undefined;
  }
};

const StaticFields = ({
  errors,
  disabled,
  indexFields,
}: RemoteElasticsearchRoutingFieldsProps & { indexFields: IndexFields }) => {
  const { control, setValue, resetField } = useFormContext<DestinationCreationFormData>();
  const staticNaming = useWatch({ control, name: 'remoteElasticsearch.staticNaming' });
  const requiredError =
    errors.staticIndexes === 'required'
      ? i18n.translate('xpack.streams.destinations.remoteElasticsearch.indexRequiredErrorMessage', {
          defaultMessage: 'Enter at least one index.',
        })
      : undefined;

  const setSharedIndex = (index: string) => {
    for (const signal of PREFIXED_DESTINATION_SIGNALS) {
      indexFields[signal].onChange(index);
    }
  };

  const onNamingChange = (naming: StaticIndexNaming) => {
    setValue('remoteElasticsearch.staticNaming', naming, { shouldDirty: true });
    if (naming !== 'shared') {
      return;
    }
    const index = getSharedRemoteIndexOnSwitch({
      logsIndex: indexFields.logs.value,
      metricsIndex: indexFields.metrics.value,
      tracesIndex: indexFields.traces.value,
    });
    if (index) {
      setSharedIndex(index);
      return;
    }
    for (const signal of PREFIXED_DESTINATION_SIGNALS) {
      resetField(getIndexFieldPath(signal));
    }
  };

  const sharedError =
    indexErrorText(errors.logsIndex) ??
    indexErrorText(errors.metricsIndex) ??
    indexErrorText(errors.tracesIndex) ??
    requiredError;

  return (
    <>
      <NamingButtonGroup naming={staticNaming} disabled={disabled} onChange={onNamingChange} />
      <EuiSpacer size="m" />
      {staticNaming === 'shared' ? (
        <SignalFieldsBox>
          <EuiFormRow
            fullWidth
            helpText={i18n.translate(
              'xpack.streams.destinations.remoteElasticsearch.allSignalsIndexHelpDescription',
              { defaultMessage: 'The same index name is used for logs, metrics, and traces.' }
            )}
            isInvalid={Boolean(sharedError)}
            error={sharedError}
          >
            <EuiFieldText
              fullWidth
              value={indexFields.logs.value}
              disabled={disabled}
              isInvalid={Boolean(sharedError)}
              prepend={<SignalPrepend label={INDEX_NAME_PREPEND} />}
              onChange={(event) => setSharedIndex(event.target.value)}
              onBlur={() => {
                for (const signal of PREFIXED_DESTINATION_SIGNALS) {
                  indexFields[signal].onBlur();
                }
              }}
              placeholder={i18n.translate(
                'xpack.streams.destinations.remoteElasticsearch.sharedIndexPlaceholder',
                { defaultMessage: 'e.g. billing-all-signals' }
              )}
              aria-label={i18n.translate(
                'xpack.streams.destinations.remoteElasticsearch.sharedIndexAriaLabel',
                { defaultMessage: 'Index name for all signals' }
              )}
              data-test-subj="streamsCreateDestinationIndex"
            />
          </EuiFormRow>
        </SignalFieldsBox>
      ) : (
        <SignalFieldsBox
          help={requiredError ?? UNNAMED_SIGNALS_HELP}
          isHelpError={Boolean(requiredError)}
        >
          {PREFIXED_DESTINATION_SIGNALS.map((signal, position) => {
            const errorText = indexErrorText(errors[SIGNAL_INDEX_FIELDS[signal]]);
            return (
              <React.Fragment key={signal}>
                {position > 0 && <EuiSpacer size="s" />}
                <EuiFormRow fullWidth isInvalid={Boolean(errorText)} error={errorText}>
                  <EuiFieldText
                    fullWidth
                    value={indexFields[signal].value}
                    disabled={disabled}
                    isInvalid={Boolean(errorText)}
                    prepend={<SignalPrepend label={DESTINATION_SIGNAL_LABELS[signal]} />}
                    onChange={(event) => indexFields[signal].onChange(event.target.value)}
                    onBlur={indexFields[signal].onBlur}
                    placeholder={i18n.translate(
                      'xpack.streams.destinations.remoteElasticsearch.perSignalIndexPlaceholder',
                      { defaultMessage: 'e.g. {signal}-billing', values: { signal } }
                    )}
                    aria-label={i18n.translate(
                      'xpack.streams.destinations.remoteElasticsearch.signalIndexAriaLabel',
                      {
                        defaultMessage: '{signal} index name',
                        values: { signal: DESTINATION_SIGNAL_LABELS[signal] },
                      }
                    )}
                    data-test-subj={`streamsCreateDestination-${signal}-index`}
                  />
                </EuiFormRow>
              </React.Fragment>
            );
          })}
        </SignalFieldsBox>
      )}
    </>
  );
};

/** Index routing for a remote Elasticsearch destination. Index names are used as typed. */
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
  const onModeChange = (nextAuto: boolean) => {
    if (nextAuto === auto) {
      return;
    }
    for (const signal of PREFIXED_DESTINATION_SIGNALS) {
      resetField(getIndexFieldPath(signal));
    }
    // `resetField` skips unregistered paths, and naming is only ever set with `setValue`.
    setValue(
      'remoteElasticsearch.staticNaming',
      EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM.staticNaming
    );
    setValue('remoteElasticsearch.auto', nextAuto, { shouldDirty: true });
  };

  return (
    <WritingModePanel
      auto={auto}
      disabled={disabled}
      radioName="streamsCreateDestinationRemoteRouting"
      onModeChange={onModeChange}
    >
      {!auto && <StaticFields {...props} indexFields={indexFields} />}
    </WritingModePanel>
  );
};
