/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  OTEL_TYPE_SEPARATOR,
  composeOtelDataStreamName,
  type OtelDataStreamName,
} from '@kbn/streams-schema';
import { SIGNAL_INDEX_FIELDS, composeOtelIndex } from './destination_models';
import { DESTINATION_SIGNAL_LABELS } from './destination_type_config';
import type { DestinationCreationFormData, PrefixedDestinationSignal } from './types';
import { INDEX_NAME_PREPEND, SignalPrepend } from './writing_mode_panel';

const DATASET_PLACEHOLDER = i18n.translate('xpack.streams.destinations.otelDatasetPlaceholder', {
  defaultMessage: 'e.g. billing',
});

const NAMESPACE_PLACEHOLDER = i18n.translate(
  'xpack.streams.destinations.otelNamespacePlaceholder',
  { defaultMessage: 'default' }
);

const getAriaLabels = (signal: PrefixedDestinationSignal | undefined) =>
  signal
    ? {
        dataset: i18n.translate('xpack.streams.destinations.signalDatasetAriaLabel', {
          defaultMessage: '{signal} dataset',
          values: { signal: DESTINATION_SIGNAL_LABELS[signal] },
        }),
        namespace: i18n.translate('xpack.streams.destinations.signalNamespaceAriaLabel', {
          defaultMessage: '{signal} namespace',
          values: { signal: DESTINATION_SIGNAL_LABELS[signal] },
        }),
      }
    : {
        dataset: i18n.translate('xpack.streams.destinations.sharedDatasetAriaLabel', {
          defaultMessage: 'Dataset for all OTel signals',
        }),
        namespace: i18n.translate('xpack.streams.destinations.sharedNamespaceAriaLabel', {
          defaultMessage: 'Namespace for all OTel signals',
        }),
      };

/** The index a name is saved as, with a placeholder for each empty part, for help text. */
export const getSavedAsName = (
  signal: PrefixedDestinationSignal,
  { dataset, namespace }: OtelDataStreamName
): string =>
  composeOtelDataStreamName(signal, {
    dataset: dataset.trim() || '<dataset>',
    namespace: namespace.trim() || '<namespace>',
  });

interface OtelNameFieldsProps {
  /** Omitted for the shared name, which every signal gets. */
  signal?: PrefixedDestinationSignal;
  value: OtelDataStreamName;
  errorText?: string;
  helpText?: string;
  disabled: boolean;
  testSubjPrefix: string;
  onChange: (name: OtelDataStreamName) => void;
  onBlur: () => void;
}

/** EuiFormRow describes only its one child, so this passes the description on to both inputs. */
const OtelNameInputs = ({
  id,
  'aria-describedby': describedBy,
  signal,
  value,
  errorText,
  disabled,
  testSubjPrefix,
  onChange,
  onBlur,
}: Omit<OtelNameFieldsProps, 'helpText'> & { id?: string; 'aria-describedby'?: string }) => {
  const ariaLabels = getAriaLabels(signal);
  const isInvalid = Boolean(errorText);
  return (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      <EuiFlexItem grow={3}>
        <EuiFieldText
          id={id}
          fullWidth
          value={value.dataset}
          disabled={disabled}
          isInvalid={isInvalid}
          prepend={
            <SignalPrepend
              label={signal ? DESTINATION_SIGNAL_LABELS[signal] : INDEX_NAME_PREPEND}
            />
          }
          onChange={(event) => onChange({ ...value, dataset: event.target.value })}
          onBlur={onBlur}
          placeholder={DATASET_PLACEHOLDER}
          aria-label={ariaLabels.dataset}
          aria-describedby={describedBy}
          data-test-subj={`${testSubjPrefix}Dataset`}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <EuiFieldText
          fullWidth
          value={value.namespace}
          disabled={disabled}
          isInvalid={isInvalid}
          prepend={OTEL_TYPE_SEPARATOR}
          onChange={(event) => onChange({ ...value, namespace: event.target.value })}
          onBlur={onBlur}
          placeholder={NAMESPACE_PLACEHOLDER}
          aria-label={ariaLabels.namespace}
          aria-describedby={describedBy}
          data-test-subj={`${testSubjPrefix}Namespace`}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/** Dataset and namespace inputs for an OTel data stream name, `<signal>-<dataset>.otel-<namespace>`. */
export const OtelNameFields = ({ helpText, ...props }: OtelNameFieldsProps) => (
  <EuiFormRow
    fullWidth
    helpText={props.errorText ? undefined : helpText}
    isInvalid={Boolean(props.errorText)}
    error={props.errorText}
  >
    <OtelNameInputs {...props} />
  </EuiFormRow>
);

/**
 * Writes a signal's name parts and the index composed from them. Validation reads the parts and
 * saving reads the index, so they are only ever set together here.
 */
export const useSetOtelName = (slice: 'elasticsearch' | 'remoteElasticsearch') => {
  const { setValue } = useFormContext<DestinationCreationFormData>();
  return (signal: PrefixedDestinationSignal, name: OtelDataStreamName) => {
    setValue(`${slice}.staticNames.${signal}`, name, { shouldDirty: true });
    setValue(`${slice}.${SIGNAL_INDEX_FIELDS[signal]}`, composeOtelIndex(signal, name), {
      shouldDirty: true,
    });
  };
};
