/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { css } from '@emotion/react';
import { EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  OTEL_TYPE_SEPARATOR,
  PROMETHEUS_TYPE_SEPARATOR,
  composeOtelDataStreamName,
  validateOtelDataStreamName,
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

const withPlaceholders = ({ dataset, namespace }: OtelDataStreamName): OtelDataStreamName => ({
  dataset: dataset.trim() || '<dataset>',
  namespace: namespace.trim() || '<namespace>',
});

/** Where a name's data lands, with a placeholder for each empty part. */
const getSavedAsHelpText = (
  signal: PrefixedDestinationSignal | undefined,
  name: OtelDataStreamName
): string | undefined => {
  const parts = withPlaceholders(name);
  const prometheus = `metrics-${parts.dataset}${PROMETHEUS_TYPE_SEPARATOR}${parts.namespace}`;
  if (!signal) {
    return i18n.translate('xpack.streams.destinations.sharedIndexSavedAsHelp', {
      defaultMessage:
        'Saved as {logs}, {metrics} and {traces}. Prometheus remote write metrics go to {prometheus}.',
      values: {
        logs: composeOtelDataStreamName('logs', parts),
        metrics: composeOtelDataStreamName('metrics', parts),
        traces: composeOtelDataStreamName('traces', parts),
        prometheus,
      },
    });
  }
  if (!name.dataset.trim()) {
    return undefined;
  }
  const index = composeOtelDataStreamName(signal, parts);
  return signal === 'metrics'
    ? i18n.translate('xpack.streams.destinations.metricsIndexSavedAsHelp', {
        defaultMessage: 'Saved as {index}. Prometheus remote write metrics go to {prometheus}.',
        values: { index, prometheus },
      })
    : i18n.translate('xpack.streams.destinations.signalIndexSavedAsHelp', {
        defaultMessage: 'Saved as {index}.',
        values: { index },
      });
};

/** Empty parts read as placeholders in the help text, so only a filled part can make it wrong. */
const hasInvalidFilledPart = ({ dataset, namespace }: OtelDataStreamName): boolean =>
  Boolean(
    validateOtelDataStreamName({
      dataset: dataset.trim() || 'x',
      namespace: namespace.trim() || 'x',
    })
  );

// A long name has no hyphen to break at.
const helpTextStyles = css({ overflowWrap: 'anywhere' });

interface OtelNameFieldsProps {
  /** Omitted for the shared name, which every signal gets. */
  signal?: PrefixedDestinationSignal;
  value: OtelDataStreamName;
  errorText?: string;
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
}: OtelNameFieldsProps & { id?: string; 'aria-describedby'?: string }) => {
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
export const OtelNameFields = (props: OtelNameFieldsProps) => {
  // Errors wait for blur, so the help text would name an invalid index while typing.
  const helpText =
    props.errorText || hasInvalidFilledPart(props.value)
      ? undefined
      : getSavedAsHelpText(props.signal, props.value);
  return (
    <EuiFormRow
      fullWidth
      helpText={helpText && <span css={helpTextStyles}>{helpText}</span>}
      isInvalid={Boolean(props.errorText)}
      error={props.errorText}
    >
      <OtelNameInputs {...props} />
    </EuiFormRow>
  );
};

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
