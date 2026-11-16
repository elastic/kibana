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
import {
  EuiButtonGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiRadio,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DESTINATION_SIGNALS, SIGNAL_INDEX_FIELDS } from './destination_models';
import {
  DESTINATION_AUTO_MODE_LABEL,
  DESTINATION_FIXED_INDEX_MODE_LABEL,
  DESTINATION_SIGNAL_LABELS,
} from './destination_type_config';
import {
  EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM,
  type DestinationCreationFormData,
  type DestinationCreationFormErrors,
  type DestinationSignal,
  type StaticIndexNaming,
} from './types';

type IndexFieldPath = `remoteElasticsearch.${(typeof SIGNAL_INDEX_FIELDS)[DestinationSignal]}`;

type IndexFields = Record<
  DestinationSignal,
  ControllerRenderProps<DestinationCreationFormData, IndexFieldPath>
>;

type IndexError = DestinationCreationFormErrors['logsIndex'];

interface RemoteElasticsearchRoutingFieldsProps {
  errors: DestinationCreationFormErrors;
  disabled: boolean;
}

const getIndexFieldPath = (signal: DestinationSignal): IndexFieldPath =>
  `remoteElasticsearch.${SIGNAL_INDEX_FIELDS[signal]}`;

const INDEX_PLACEHOLDER = i18n.translate(
  'xpack.streams.destinations.remoteElasticsearch.indexPlaceholder',
  { defaultMessage: 'my-index' }
);

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
  const { control, setValue } = useFormContext<DestinationCreationFormData>();
  const staticNaming = useWatch({ control, name: 'remoteElasticsearch.staticNaming' });
  const requiredError =
    errors.staticIndexes === 'required'
      ? i18n.translate('xpack.streams.destinations.remoteElasticsearch.indexRequiredErrorMessage', {
          defaultMessage: 'Enter at least one index.',
        })
      : undefined;

  const namingOptions = [
    {
      id: 'shared',
      label: i18n.translate('xpack.streams.destinations.remoteElasticsearch.sharedNamingLabel', {
        defaultMessage: 'One index for all signals',
      }),
      'data-test-subj': 'streamsCreateDestinationIndexNaming-shared',
    },
    {
      id: 'perSignal',
      label: i18n.translate('xpack.streams.destinations.remoteElasticsearch.perSignalNamingLabel', {
        defaultMessage: 'Name signals individually',
      }),
      'data-test-subj': 'streamsCreateDestinationIndexNaming-perSignal',
    },
  ];

  const setSharedIndex = (index: string) => {
    for (const signal of DESTINATION_SIGNALS) {
      indexFields[signal].onChange(index);
    }
  };

  const onNamingChange = (nextNaming: string) => {
    const naming = nextNaming as StaticIndexNaming;
    setValue('remoteElasticsearch.staticNaming', naming, { shouldDirty: true });
    if (naming === 'shared') {
      setSharedIndex(
        DESTINATION_SIGNALS.map((signal) => indexFields[signal].value).find(Boolean) ?? ''
      );
    }
  };

  const sharedError =
    indexErrorText(errors.logsIndex) ??
    indexErrorText(errors.metricsIndex) ??
    indexErrorText(errors.tracesIndex) ??
    requiredError;

  return (
    <>
      <EuiButtonGroup
        legend={i18n.translate('xpack.streams.destinations.remoteElasticsearch.namingLegend', {
          defaultMessage: 'Fixed index naming',
        })}
        buttonSize="compressed"
        isFullWidth
        isDisabled={disabled}
        options={namingOptions}
        idSelected={staticNaming}
        onChange={onNamingChange}
        data-test-subj="streamsCreateDestinationIndexNaming"
      />
      <EuiSpacer size="s" />
      {staticNaming === 'shared' ? (
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
            onChange={(event) => setSharedIndex(event.target.value)}
            onBlur={() => {
              for (const signal of DESTINATION_SIGNALS) {
                indexFields[signal].onBlur();
              }
            }}
            placeholder={INDEX_PLACEHOLDER}
            aria-label={i18n.translate(
              'xpack.streams.destinations.remoteElasticsearch.sharedIndexAriaLabel',
              { defaultMessage: 'Index name for all signals' }
            )}
            data-test-subj="streamsCreateDestinationIndex"
          />
        </EuiFormRow>
      ) : (
        <>
          {DESTINATION_SIGNALS.map((signal) => {
            const errorText = indexErrorText(errors[SIGNAL_INDEX_FIELDS[signal]]);
            return (
              <EuiFormRow
                key={signal}
                fullWidth
                label={DESTINATION_SIGNAL_LABELS[signal]}
                isInvalid={Boolean(errorText)}
                error={errorText}
              >
                <EuiFieldText
                  fullWidth
                  value={indexFields[signal].value}
                  disabled={disabled}
                  isInvalid={Boolean(errorText)}
                  onChange={(event) => indexFields[signal].onChange(event.target.value)}
                  onBlur={indexFields[signal].onBlur}
                  placeholder={INDEX_PLACEHOLDER}
                  data-test-subj={`streamsCreateDestination-${signal}-index`}
                />
              </EuiFormRow>
            );
          })}
          <EuiSpacer size="xs" />
          <EuiText size="xs" color={requiredError ? 'danger' : 'subdued'}>
            <p>
              {requiredError ??
                i18n.translate(
                  'xpack.streams.destinations.remoteElasticsearch.perSignalIndexHelpDescription',
                  { defaultMessage: 'Leave a signal blank to not send it to this destination.' }
                )}
            </p>
          </EuiText>
        </>
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
  const autoRadioId = useGeneratedHtmlId({ prefix: 'streamsCreateDestinationRemoteRoutingAuto' });
  const staticRadioId = useGeneratedHtmlId({
    prefix: 'streamsCreateDestinationRemoteRoutingStatic',
  });

  const onModeChange = (nextAuto: boolean) => {
    if (nextAuto === auto) {
      return;
    }
    for (const signal of DESTINATION_SIGNALS) {
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
    <>
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.streams.destinations.remoteElasticsearch.indexModeTitle', {
            defaultMessage: 'Index mode',
          })}
        </h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('xpack.streams.destinations.remoteElasticsearch.indexModeDescription', {
            defaultMessage:
              'Route each document by its target index or its data stream fields, or set a fixed index.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="l" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiRadio
            id={autoRadioId}
            name="streamsCreateDestinationRemoteRouting"
            label={DESTINATION_AUTO_MODE_LABEL}
            checked={auto}
            disabled={disabled}
            onChange={() => onModeChange(true)}
            data-test-subj="streamsCreateDestinationAuto"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiRadio
            id={staticRadioId}
            name="streamsCreateDestinationRemoteRouting"
            label={DESTINATION_FIXED_INDEX_MODE_LABEL}
            checked={!auto}
            disabled={disabled}
            onChange={() => onModeChange(false)}
            data-test-subj="streamsCreateDestinationFixedIndex"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {!auto && (
        <>
          <EuiHorizontalRule margin="s" />
          <StaticFields {...props} indexFields={indexFields} />
        </>
      )}
    </>
  );
};
