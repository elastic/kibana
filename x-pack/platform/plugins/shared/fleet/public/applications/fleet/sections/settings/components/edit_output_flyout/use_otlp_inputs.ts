/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';

import type {
  NewOtlpOutput,
  OtlpExporterConfig,
  OtlpGrpcExporterConfig,
  OtlpHttpExporterConfig,
} from '../../../../../../../common/types/models';
import {
  MANAGED_OTLP_EXPORTER_DEFAULTS,
  OTLP_GRPC_ONLY_COMPRESSION_TYPES,
  otlpCompressionType,
  otlpProtocol,
} from '../../../../../../../common/constants';

import { useInput, useKeyValueInput, useSwitchInput } from '../../../../hooks';

import {
  validateOtlpByteSize,
  validateOtlpCompressionLevel,
  validateOtlpCount,
  validateOtlpDecimal,
  validateOtlpDuration,
  validateOtlpEndpoint,
  validateOtlpHeaders,
  validateOtlpHttpEndpoint,
  validateOtlpHttpUrl,
  validateOtlpMetadataKeys,
  validateOtlpPositiveCount,
  validateOtlpPositiveDuration,
  validateOtlpRandomizationFactor,
  parseOtlpDurationMs,
  validateOtlpProxyUrl,
  validateOtlpShortString,
} from './output_form_validators';

type OtlpProtocol = OtlpExporterConfig['protocol'];
type OtlpHttpEncoding = NonNullable<OtlpHttpExporterConfig['encoding']>;

export const OTLP_HTTP_DEFAULT_ENCODING: OtlpHttpEncoding = 'proto';
// the spec enables it by default, so the switch is on unless an output turned it off
const OTLP_HTTP_DEFAULT_FORCE_ATTEMPT_HTTP2 = true;

// The sending queue is prefilled with the settings that Elastic recommends, for a new output. The
// other settings of the sending queue and the retry have no value, so the spec defaults apply.
const QUEUE_DEFAULTS = MANAGED_OTLP_EXPORTER_DEFAULTS.sending_queue;

/** The spec defaults of the settings that have a switch or a select, so they can not be empty. */
export const OTLP_QUEUE_SPEC_DEFAULT_SIZER = 'requests';
const OTLP_QUEUE_SPEC_DEFAULT_SIZE = 1000;
const OTLP_BATCH_SPEC_DEFAULT_MIN_SIZE = 8192;
const OTLP_RETRY_SPEC_DEFAULT_INITIAL_INTERVAL = '5s';
const OTLP_RETRY_SPEC_DEFAULT_MAX_INTERVAL = '30s';

/** Re-validates an input that shows an error when what its check depends on changes. */
const useRevalidateWhenChanged = (
  input: { errors?: string[]; validate: () => boolean },
  dependencies: unknown[]
) => {
  useEffect(() => {
    if (input.errors) {
      input.validate();
    }
    // only the values it depends on: validate changes on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
};

type OtlpQueueConfig = NonNullable<OtlpExporterConfig['sending_queue']>;
type OtlpQueueSizer = NonNullable<OtlpQueueConfig['sizer']>;
type OtlpBatchSizer = 'items' | 'bytes';

const headersToRows = (
  headers: Record<string, string> | null | undefined
): Array<{ key: string; value: string }> => {
  const rows = Object.entries(headers ?? {}).map(([key, value]) => ({ key, value }));
  return rows.length ? rows : [{ key: '', value: '' }];
};

// an HTTP endpoint is a URL, which an endpoint kept from gRPC may not be
const getOtlpEndpointValidator = (protocol: string) =>
  protocol === otlpProtocol.HttpProtobuf ? validateOtlpHttpEndpoint : validateOtlpEndpoint;

const toInputValue = (value: string | number | null | undefined) =>
  value === null || value === undefined ? '' : `${value}`;

/** The inputs of the OTLP output: the settings shared by both protocols, and the ones of each protocol. */
export function useOtlpInputs(
  otlpOutput: NewOtlpOutput | undefined,
  isSelected: boolean,
  disabled: boolean
) {
  const exporter = otlpOutput?.otlp_exporter;
  const grpc: Partial<OtlpGrpcExporterConfig> | undefined =
    exporter?.protocol === otlpProtocol.Grpc ? exporter : undefined;
  const http: Partial<OtlpHttpExporterConfig> | undefined =
    exporter?.protocol === otlpProtocol.HttpProtobuf ? exporter : undefined;
  const validateIfSelected = <T>(validator: T) => (isSelected ? validator : undefined);

  // a new output uses gRPC
  const otlpProtocolInput = useInput(exporter?.protocol ?? otlpProtocol.Grpc, undefined, disabled);

  const otlpEndpointInput = useInput(
    exporter?.endpoint ?? '',
    validateIfSelected(getOtlpEndpointValidator(otlpProtocolInput.value)),
    disabled
  );
  const otlpCompressionInput = useInput(
    exporter?.compression ?? otlpCompressionType.Gzip,
    undefined,
    disabled
  );
  const otlpTimeoutInput = useInput(
    toInputValue(exporter?.timeout),
    validateIfSelected(validateOtlpDuration),
    disabled
  );
  const otlpHeadersInput = useKeyValueInput(
    'otlpHeadersComboBox',
    headersToRows(exporter?.headers),
    validateIfSelected(validateOtlpHeaders),
    disabled
  );

  // gRPC
  const otlpBalancerNameInput = useInput(
    toInputValue(grpc?.balancer_name),
    validateIfSelected(validateOtlpShortString),
    disabled
  );
  const otlpKeepaliveTimeInput = useInput(
    toInputValue(grpc?.keepalive?.time),
    validateIfSelected(validateOtlpDuration),
    disabled
  );
  const otlpKeepaliveTimeoutInput = useInput(
    toInputValue(grpc?.keepalive?.timeout),
    validateIfSelected(validateOtlpDuration),
    disabled
  );
  const otlpKeepalivePermitWithoutStreamInput = useSwitchInput(
    grpc?.keepalive?.permit_without_stream ?? false,
    disabled
  );
  // both protocols have buffer sizes, with their own defaults: each protocol has its own inputs
  const otlpReadBufferSizeInput = useInput(
    toInputValue(grpc?.read_buffer_size),
    validateIfSelected(validateOtlpByteSize),
    disabled
  );
  const otlpWriteBufferSizeInput = useInput(
    toInputValue(grpc?.write_buffer_size),
    validateIfSelected(validateOtlpByteSize),
    disabled
  );
  const otlpWaitForReadyInput = useSwitchInput(grpc?.wait_for_ready ?? false, disabled);
  const otlpUserAgentInput = useInput(
    toInputValue(grpc?.user_agent),
    validateIfSelected(validateOtlpShortString),
    disabled
  );
  const otlpAuthorityInput = useInput(
    toInputValue(grpc?.authority),
    validateIfSelected(validateOtlpShortString),
    disabled
  );

  // HTTP
  const otlpEncodingInput = useInput(
    http?.encoding ?? OTLP_HTTP_DEFAULT_ENCODING,
    undefined,
    disabled
  );
  const otlpTracesEndpointInput = useInput(
    toInputValue(http?.traces_endpoint),
    validateIfSelected(validateOtlpHttpUrl),
    disabled
  );
  const otlpMetricsEndpointInput = useInput(
    toInputValue(http?.metrics_endpoint),
    validateIfSelected(validateOtlpHttpUrl),
    disabled
  );
  const otlpLogsEndpointInput = useInput(
    toInputValue(http?.logs_endpoint),
    validateIfSelected(validateOtlpHttpUrl),
    disabled
  );
  const otlpProfilesEndpointInput = useInput(
    toInputValue(http?.profiles_endpoint),
    validateIfSelected(validateOtlpHttpUrl),
    disabled
  );
  const otlpHttpReadBufferSizeInput = useInput(
    toInputValue(http?.read_buffer_size),
    validateIfSelected(validateOtlpByteSize),
    disabled
  );
  const otlpHttpWriteBufferSizeInput = useInput(
    toInputValue(http?.write_buffer_size),
    validateIfSelected(validateOtlpByteSize),
    disabled
  );
  const otlpProxyUrlInput = useInput(
    toInputValue(http?.proxy_url),
    validateIfSelected(validateOtlpProxyUrl),
    disabled
  );
  const otlpMaxIdleConnsInput = useInput(
    toInputValue(http?.max_idle_conns),
    validateIfSelected(validateOtlpCount),
    disabled
  );
  const otlpMaxIdleConnsPerHostInput = useInput(
    toInputValue(http?.max_idle_conns_per_host),
    validateIfSelected(validateOtlpCount),
    disabled
  );
  const otlpMaxConnsPerHostInput = useInput(
    toInputValue(http?.max_conns_per_host),
    validateIfSelected(validateOtlpCount),
    disabled
  );
  const otlpIdleConnTimeoutInput = useInput(
    toInputValue(http?.idle_conn_timeout),
    validateIfSelected(validateOtlpDuration),
    disabled
  );
  const otlpDisableKeepAlivesInput = useSwitchInput(http?.disable_keep_alives ?? false, disabled);
  const otlpHttp2ReadIdleTimeoutInput = useInput(
    toInputValue(http?.http2_read_idle_timeout),
    validateIfSelected(validateOtlpDuration),
    disabled
  );
  const otlpHttp2PingTimeoutInput = useInput(
    toInputValue(http?.http2_ping_timeout),
    validateIfSelected(validateOtlpDuration),
    disabled
  );
  const otlpForceAttemptHttp2Input = useSwitchInput(
    http?.force_attempt_http2 ?? OTLP_HTTP_DEFAULT_FORCE_ATTEMPT_HTTP2,
    disabled
  );
  const otlpCompressionLevelInput = useInput(
    toInputValue(http?.compression_params?.level),
    validateIfSelected(validateOtlpCompressionLevel),
    disabled
  );
  const otlpCookiesEnabledInput = useSwitchInput(http?.cookies?.enabled ?? false, disabled);

  // sending queue and retry, shared by both protocols
  const queue = exporter?.sending_queue;
  // a new output starts with the recommended queue, an existing one with what it has stored
  const queueInitial: OtlpQueueConfig | null | undefined = otlpOutput ? queue : QUEUE_DEFAULTS;
  const batchInitial = queueInitial?.batch;
  const otlpQueueEnabledInput = useSwitchInput(queueInitial?.enabled ?? true, disabled);
  const otlpQueueNumConsumersInput = useInput(
    toInputValue(queueInitial?.num_consumers),
    validateIfSelected(validateOtlpPositiveCount),
    disabled
  );
  const otlpQueueSizeInput = useInput(
    toInputValue(queueInitial?.queue_size),
    validateIfSelected(validateOtlpPositiveCount),
    disabled
  );
  const otlpQueueSizerInput = useInput(
    queueInitial?.sizer ?? OTLP_QUEUE_SPEC_DEFAULT_SIZER,
    undefined,
    disabled
  );
  const otlpQueueWaitForResultInput = useSwitchInput(
    queueInitial?.wait_for_result ?? false,
    disabled
  );
  const otlpQueueBlockOnOverflowInput = useSwitchInput(
    queueInitial?.block_on_overflow ?? false,
    disabled
  );

  // `batch: {}` enables batching with the defaults, so whether the output batches is its own setting
  const otlpBatchEnabledInput = useSwitchInput(!!batchInitial, disabled);
  const validateIfBatching = <T>(validator: T) =>
    isSelected && otlpBatchEnabledInput.value ? validator : undefined;
  const otlpBatchFlushTimeoutInput = useInput(
    toInputValue(batchInitial?.flush_timeout),
    validateIfBatching(validateOtlpPositiveDuration),
    disabled
  );
  // an empty unit is the spec default, the unit of the queue: a stored batch without one keeps it
  const otlpBatchSizerInput = useInput(batchInitial?.sizer ?? '', undefined, disabled);
  const otlpBatchMinSizeInput = useInput(
    toInputValue(batchInitial?.min_size),
    validateIfBatching((value: string) => {
      const error = validateOtlpCount(value);
      if (error || !value.trim() || !otlpQueueEnabledInput.value) {
        return error;
      }
      // the sizes are compared when both use the same unit
      const batchSizer = otlpBatchSizerInput.value || otlpQueueSizerInput.value;
      const queueSize = otlpQueueSizeInput.value.trim()
        ? Number(otlpQueueSizeInput.value)
        : OTLP_QUEUE_SPEC_DEFAULT_SIZE;
      if (batchSizer === otlpQueueSizerInput.value && Number(value) > queueSize) {
        return [
          i18n.translate('xpack.fleet.settings.outputForm.otlpBatchMinSizeTooBig', {
            defaultMessage:
              'The minimum size can not be more than the queue size ({queueSize}) when both use the same unit',
            values: { queueSize },
          }),
        ];
      }
    }),
    disabled
  );
  const otlpBatchMaxSizeInput = useInput(
    toInputValue(batchInitial?.max_size),
    validateIfBatching((value: string) => {
      const error = validateOtlpCount(value);
      if (error || !value.trim() || Number(value) === 0) {
        return error;
      }
      // a blank minimum is the spec default
      const minSize = otlpBatchMinSizeInput.value.trim()
        ? Number(otlpBatchMinSizeInput.value)
        : OTLP_BATCH_SPEC_DEFAULT_MIN_SIZE;
      if (Number(value) < minSize) {
        return [
          i18n.translate('xpack.fleet.settings.outputForm.otlpBatchMaxSizeTooSmall', {
            defaultMessage:
              'The maximum size can not be less than the minimum size ({minSize}), unless it is 0',
            values: { minSize },
          }),
        ];
      }
    }),
    disabled
  );
  const otlpBatchMetadataKeysInput = useInput(
    (batchInitial?.partition?.metadata_keys ?? []).join(', '),
    validateIfBatching(validateOtlpMetadataKeys),
    disabled
  );

  // a fix of one setting clears the error that another one showed because of it
  useRevalidateWhenChanged(otlpBatchMinSizeInput, [
    otlpQueueEnabledInput.value,
    otlpQueueSizeInput.value,
    otlpQueueSizerInput.value,
    otlpBatchSizerInput.value,
  ]);
  useRevalidateWhenChanged(otlpBatchMaxSizeInput, [otlpBatchMinSizeInput.value]);
  // the errors of the batch settings do not apply when batching is off
  useEffect(() => {
    if (!otlpBatchEnabledInput.value) {
      [
        otlpBatchFlushTimeoutInput,
        otlpBatchMinSizeInput,
        otlpBatchMaxSizeInput,
        otlpBatchMetadataKeysInput,
      ].forEach((input) => input.setErrors(undefined));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otlpBatchEnabledInput.value]);

  const retry = exporter?.retry_on_failure;
  const otlpRetryEnabledInput = useSwitchInput(retry?.enabled ?? true, disabled);
  const otlpRetryInitialIntervalInput = useInput(
    toInputValue(retry?.initial_interval),
    validateIfSelected(validateOtlpDuration),
    disabled
  );
  const otlpRetryRandomizationFactorInput = useInput(
    toInputValue(retry?.randomization_factor),
    validateIfSelected(validateOtlpRandomizationFactor),
    disabled
  );
  const otlpRetryMultiplierInput = useInput(
    toInputValue(retry?.multiplier),
    validateIfSelected(validateOtlpDecimal),
    disabled
  );
  const otlpRetryMaxIntervalInput = useInput(
    toInputValue(retry?.max_interval),
    validateIfSelected(validateOtlpDuration),
    disabled
  );
  const otlpRetryMaxElapsedTimeInput = useInput(
    toInputValue(retry?.max_elapsed_time),
    validateIfSelected((value: string) => {
      const error = validateOtlpDuration(value);
      const elapsed = parseOtlpDurationMs(value);
      if (error || !elapsed) {
        // empty, or 0 to retry forever
        return error;
      }
      // a blank interval is the spec default
      const intervals = [
        {
          text: otlpRetryInitialIntervalInput.value.trim(),
          fallback: OTLP_RETRY_SPEC_DEFAULT_INITIAL_INTERVAL,
        },
        {
          text: otlpRetryMaxIntervalInput.value.trim(),
          fallback: OTLP_RETRY_SPEC_DEFAULT_MAX_INTERVAL,
        },
      ].map(({ text: intervalText, fallback }) => {
        const interval = intervalText || fallback;
        return { interval, ms: parseOtlpDurationMs(interval) ?? 0 };
      });
      const longest = intervals.reduce((a, b) => (b.ms > a.ms ? b : a));
      if (elapsed < longest.ms) {
        return [
          i18n.translate('xpack.fleet.settings.outputForm.otlpRetryMaxElapsedTimeTooSmall', {
            defaultMessage:
              'The maximum elapsed time can not be less than the longest retry interval ({interval}), unless it is 0',
            values: { interval: longest.interval },
          }),
        ];
      }
    }),
    disabled
  );
  useRevalidateWhenChanged(otlpRetryMaxElapsedTimeInput, [
    otlpRetryInitialIntervalInput.value,
    otlpRetryMaxIntervalInput.value,
  ]);

  return {
    otlpProtocolInput,
    otlpEndpointInput,
    otlpCompressionInput,
    otlpTimeoutInput,
    otlpHeadersInput,
    otlpBalancerNameInput,
    otlpKeepaliveTimeInput,
    otlpKeepaliveTimeoutInput,
    otlpKeepalivePermitWithoutStreamInput,
    otlpReadBufferSizeInput,
    otlpWriteBufferSizeInput,
    otlpWaitForReadyInput,
    otlpUserAgentInput,
    otlpAuthorityInput,
    otlpEncodingInput,
    otlpTracesEndpointInput,
    otlpMetricsEndpointInput,
    otlpLogsEndpointInput,
    otlpProfilesEndpointInput,
    otlpHttpReadBufferSizeInput,
    otlpHttpWriteBufferSizeInput,
    otlpProxyUrlInput,
    otlpMaxIdleConnsInput,
    otlpMaxIdleConnsPerHostInput,
    otlpMaxConnsPerHostInput,
    otlpIdleConnTimeoutInput,
    otlpDisableKeepAlivesInput,
    otlpHttp2ReadIdleTimeoutInput,
    otlpHttp2PingTimeoutInput,
    otlpForceAttemptHttp2Input,
    otlpCompressionLevelInput,
    otlpCookiesEnabledInput,
    otlpQueueEnabledInput,
    otlpQueueNumConsumersInput,
    otlpQueueSizeInput,
    otlpQueueSizerInput,
    otlpQueueWaitForResultInput,
    otlpQueueBlockOnOverflowInput,
    otlpBatchEnabledInput,
    otlpBatchFlushTimeoutInput,
    otlpBatchMinSizeInput,
    otlpBatchMaxSizeInput,
    otlpBatchSizerInput,
    otlpBatchMetadataKeysInput,
    otlpRetryEnabledInput,
    otlpRetryInitialIntervalInput,
    otlpRetryRandomizationFactorInput,
    otlpRetryMultiplierInput,
    otlpRetryMaxIntervalInput,
    otlpRetryMaxElapsedTimeInput,
  };
}

export type OtlpInputs = ReturnType<typeof useOtlpInputs>;

export const isOtlpGrpc = (inputs: OtlpInputs) =>
  inputs.otlpProtocolInput.value === otlpProtocol.Grpc;

const grpcTextInputs = (inputs: OtlpInputs) => [
  inputs.otlpBalancerNameInput,
  inputs.otlpKeepaliveTimeInput,
  inputs.otlpKeepaliveTimeoutInput,
  inputs.otlpReadBufferSizeInput,
  inputs.otlpWriteBufferSizeInput,
  inputs.otlpUserAgentInput,
  inputs.otlpAuthorityInput,
];

const httpTextInputs = (inputs: OtlpInputs) => [
  inputs.otlpTracesEndpointInput,
  inputs.otlpMetricsEndpointInput,
  inputs.otlpLogsEndpointInput,
  inputs.otlpProfilesEndpointInput,
  inputs.otlpHttpReadBufferSizeInput,
  inputs.otlpHttpWriteBufferSizeInput,
  inputs.otlpProxyUrlInput,
  inputs.otlpMaxIdleConnsInput,
  inputs.otlpMaxIdleConnsPerHostInput,
  inputs.otlpMaxConnsPerHostInput,
  inputs.otlpIdleConnTimeoutInput,
  inputs.otlpHttp2ReadIdleTimeoutInput,
  inputs.otlpHttp2PingTimeoutInput,
  inputs.otlpCompressionLevelInput,
];

/** Whether a gRPC setting is set, other than to its default. */
export const hasOtlpGrpcSettings = (inputs: OtlpInputs) =>
  grpcTextInputs(inputs).some((input) => !!input.value) ||
  inputs.otlpKeepalivePermitWithoutStreamInput.value ||
  inputs.otlpWaitForReadyInput.value;

/** Whether an HTTP setting is set, other than to its default. */
export const hasOtlpHttpSettings = (inputs: OtlpInputs) =>
  httpTextInputs(inputs).some((input) => !!input.value) ||
  inputs.otlpEncodingInput.value !== OTLP_HTTP_DEFAULT_ENCODING ||
  inputs.otlpDisableKeepAlivesInput.value ||
  inputs.otlpForceAttemptHttp2Input.value !== OTLP_HTTP_DEFAULT_FORCE_ATTEMPT_HTTP2 ||
  inputs.otlpCookiesEnabledInput.value;

const batchTextInputs = (inputs: OtlpInputs) => [
  inputs.otlpBatchFlushTimeoutInput,
  inputs.otlpBatchMinSizeInput,
  inputs.otlpBatchMaxSizeInput,
  inputs.otlpBatchMetadataKeysInput,
];

const queueTextInputs = (inputs: OtlpInputs) => [
  inputs.otlpQueueNumConsumersInput,
  inputs.otlpQueueSizeInput,
  ...batchTextInputs(inputs),
];

const retryTextInputs = (inputs: OtlpInputs) => [
  inputs.otlpRetryInitialIntervalInput,
  inputs.otlpRetryRandomizationFactorInput,
  inputs.otlpRetryMultiplierInput,
  inputs.otlpRetryMaxIntervalInput,
  inputs.otlpRetryMaxElapsedTimeInput,
];

/** Whether the sending queue is left to the spec defaults: nothing is set, and there is no batching. */
const isQueueUnset = (inputs: OtlpInputs) =>
  [inputs.otlpQueueNumConsumersInput, inputs.otlpQueueSizeInput].every(
    (input) => !input.value.trim()
  ) &&
  inputs.otlpQueueEnabledInput.value &&
  !inputs.otlpQueueWaitForResultInput.value &&
  !inputs.otlpQueueBlockOnOverflowInput.value &&
  inputs.otlpQueueSizerInput.value === OTLP_QUEUE_SPEC_DEFAULT_SIZER &&
  !inputs.otlpBatchEnabledInput.value;

/** Whether the retry is left to the spec defaults: nothing is set. */
const isRetryUnset = (inputs: OtlpInputs) =>
  retryTextInputs(inputs).every((input) => !input.value.trim()) &&
  inputs.otlpRetryEnabledInput.value;

const isQueueRecommended = (inputs: OtlpInputs) =>
  inputs.otlpQueueEnabledInput.value === QUEUE_DEFAULTS.enabled &&
  inputs.otlpQueueSizerInput.value === QUEUE_DEFAULTS.sizer &&
  inputs.otlpQueueSizeInput.value === `${QUEUE_DEFAULTS.queue_size}` &&
  inputs.otlpQueueBlockOnOverflowInput.value === QUEUE_DEFAULTS.block_on_overflow &&
  inputs.otlpBatchEnabledInput.value &&
  !inputs.otlpQueueWaitForResultInput.value &&
  !inputs.otlpQueueNumConsumersInput.value.trim() &&
  inputs.otlpBatchFlushTimeoutInput.value === QUEUE_DEFAULTS.batch.flush_timeout &&
  inputs.otlpBatchMinSizeInput.value === `${QUEUE_DEFAULTS.batch.min_size}` &&
  inputs.otlpBatchMaxSizeInput.value === `${QUEUE_DEFAULTS.batch.max_size}` &&
  inputs.otlpBatchSizerInput.value === QUEUE_DEFAULTS.batch.sizer &&
  !inputs.otlpBatchMetadataKeysInput.value.trim();

/** Whether the sending queue has a setting that is neither empty nor the recommended default. */
export const hasOtlpQueueSettings = (inputs: OtlpInputs) =>
  !isQueueUnset(inputs) && !isQueueRecommended(inputs);

/** Whether the retry has a setting. */
export const hasOtlpRetrySettings = (inputs: OtlpInputs) => !isRetryUnset(inputs);

/**
 * Selects the protocol, and resets the settings of both protocols: the settings of the previous
 * protocol do not apply to the new one. The settings shared by both protocols are kept, except a
 * compression that the new protocol does not support.
 */
export function changeOtlpProtocol(inputs: OtlpInputs, protocol: OtlpProtocol) {
  if (protocol === inputs.otlpProtocolInput.value) {
    return;
  }
  inputs.otlpProtocolInput.setValue(protocol);

  // the endpoint is kept, but an error shown for the previous protocol may not apply to the new one
  if (inputs.otlpEndpointInput.errors) {
    inputs.otlpEndpointInput.setErrors(
      getOtlpEndpointValidator(protocol)(inputs.otlpEndpointInput.value)
    );
  }

  [...grpcTextInputs(inputs), ...httpTextInputs(inputs)].forEach((input) => {
    input.setValue('');
    // a hidden setting must not keep an error that blocks saving
    input.setErrors(undefined);
  });
  inputs.otlpKeepalivePermitWithoutStreamInput.setValue(false);
  inputs.otlpWaitForReadyInput.setValue(false);
  inputs.otlpEncodingInput.setValue(OTLP_HTTP_DEFAULT_ENCODING);
  inputs.otlpDisableKeepAlivesInput.setValue(false);
  inputs.otlpForceAttemptHttp2Input.setValue(OTLP_HTTP_DEFAULT_FORCE_ATTEMPT_HTTP2);
  inputs.otlpCookiesEnabledInput.setValue(false);

  if (
    protocol === otlpProtocol.HttpProtobuf &&
    OTLP_GRPC_ONLY_COMPRESSION_TYPES.includes(inputs.otlpCompressionInput.value)
  ) {
    inputs.otlpCompressionInput.setValue(otlpCompressionType.Gzip);
  }
}

/** Validates every input, so all the errors are shown. Returns whether they are all valid. */
export const validateOtlpInputs = (inputs: OtlpInputs): boolean =>
  [
    inputs.otlpEndpointInput.validate(),
    inputs.otlpTimeoutInput.validate(),
    inputs.otlpHeadersInput.validate(),
    ...(isOtlpGrpc(inputs) ? grpcTextInputs(inputs) : httpTextInputs(inputs)).map((input) =>
      input.validate()
    ),
    ...[...queueTextInputs(inputs), ...retryTextInputs(inputs)].map((input) => input.validate()),
  ].every(Boolean);

// An update is deep merged into the stored output, so a cleared setting is sent as `null` to
// remove the stored value rather than left out.
const text = (input: { value?: string }) => input.value?.trim() || null;
const integer = (input: { value?: string }) => {
  const value = input.value?.trim();
  return value ? Number(value) : null;
};

const decimal = (input: { value?: string }) => {
  const value = input.value?.trim();
  return value ? Number(value) : null;
};

const metadataKeys = (input: { value: string }) => {
  const keys = input.value
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
  return keys.length ? keys : null;
};

/**
 * The sending queue and retry of the payload. A section with nothing set is sent as `null`, to
 * remove what an update would otherwise keep. A section with a setting sends `null` for the
 * settings that are empty.
 */
function buildOtlpQueueAndRetry(inputs: OtlpInputs) {
  // a batch is sent while batching is on, even with every setting empty: `batch: {}` enables it
  const batch = inputs.otlpBatchEnabledInput.value
    ? {
        flush_timeout: text(inputs.otlpBatchFlushTimeoutInput),
        min_size: integer(inputs.otlpBatchMinSizeInput),
        max_size: integer(inputs.otlpBatchMaxSizeInput),
        // no unit is the spec default, and the schema can not unset one: it is left out
        ...(inputs.otlpBatchSizerInput.value
          ? { sizer: inputs.otlpBatchSizerInput.value as OtlpBatchSizer }
          : {}),
        partition: metadataKeys(inputs.otlpBatchMetadataKeysInput)
          ? { metadata_keys: metadataKeys(inputs.otlpBatchMetadataKeysInput) }
          : null,
      }
    : null;

  return {
    sending_queue: isQueueUnset(inputs)
      ? null
      : {
          enabled: inputs.otlpQueueEnabledInput.value,
          num_consumers: integer(inputs.otlpQueueNumConsumersInput),
          queue_size: integer(inputs.otlpQueueSizeInput),
          sizer: inputs.otlpQueueSizerInput.value as OtlpQueueSizer,
          wait_for_result: inputs.otlpQueueWaitForResultInput.value,
          block_on_overflow: inputs.otlpQueueBlockOnOverflowInput.value,
          batch,
        },
    retry_on_failure: isRetryUnset(inputs)
      ? null
      : {
          enabled: inputs.otlpRetryEnabledInput.value,
          initial_interval: text(inputs.otlpRetryInitialIntervalInput),
          randomization_factor: decimal(inputs.otlpRetryRandomizationFactorInput),
          multiplier: decimal(inputs.otlpRetryMultiplierInput),
          max_interval: text(inputs.otlpRetryMaxIntervalInput),
          max_elapsed_time: text(inputs.otlpRetryMaxElapsedTimeInput),
        },
  };
}

/**
 * Builds the `otlp_exporter` of the payload from the settings this form edits. The settings it
 * does not edit yet (TLS) are left out, so an update keeps them.
 *
 * Only the settings of the selected protocol are sent: the schema of a protocol rejects the
 * settings of the other one. When an update changes the protocol, the server removes the stored
 * settings that only the previous protocol has.
 */
export function buildOtlpExporterConfig(inputs: OtlpInputs): OtlpExporterConfig {
  const headers = new Map<string, string>();
  inputs.otlpHeadersInput.value.forEach(({ key, value }) => {
    if (key && value) {
      headers.set(key, value);
    }
  });

  const base = {
    endpoint: inputs.otlpEndpointInput.value.trim(),
    timeout: text(inputs.otlpTimeoutInput),
    headers: headers.size ? Object.fromEntries(headers) : null,
    ...buildOtlpQueueAndRetry(inputs),
  };

  if (!isOtlpGrpc(inputs)) {
    const compressionLevel = integer(inputs.otlpCompressionLevelInput);
    return {
      ...base,
      protocol: otlpProtocol.HttpProtobuf,
      compression: inputs.otlpCompressionInput.value as OtlpHttpExporterConfig['compression'],
      encoding: inputs.otlpEncodingInput.value as OtlpHttpEncoding,
      traces_endpoint: text(inputs.otlpTracesEndpointInput),
      metrics_endpoint: text(inputs.otlpMetricsEndpointInput),
      logs_endpoint: text(inputs.otlpLogsEndpointInput),
      profiles_endpoint: text(inputs.otlpProfilesEndpointInput),
      read_buffer_size: integer(inputs.otlpHttpReadBufferSizeInput),
      write_buffer_size: integer(inputs.otlpHttpWriteBufferSizeInput),
      proxy_url: text(inputs.otlpProxyUrlInput),
      max_idle_conns: integer(inputs.otlpMaxIdleConnsInput),
      max_idle_conns_per_host: integer(inputs.otlpMaxIdleConnsPerHostInput),
      max_conns_per_host: integer(inputs.otlpMaxConnsPerHostInput),
      idle_conn_timeout: text(inputs.otlpIdleConnTimeoutInput),
      disable_keep_alives: inputs.otlpDisableKeepAlivesInput.value,
      http2_read_idle_timeout: text(inputs.otlpHttp2ReadIdleTimeoutInput),
      http2_ping_timeout: text(inputs.otlpHttp2PingTimeoutInput),
      force_attempt_http2: inputs.otlpForceAttemptHttp2Input.value,
      compression_params: compressionLevel === null ? null : { level: compressionLevel },
      cookies: inputs.otlpCookiesEnabledInput.value ? { enabled: true } : null,
    };
  }

  const keepaliveTime = text(inputs.otlpKeepaliveTimeInput);
  const keepaliveTimeout = text(inputs.otlpKeepaliveTimeoutInput);
  const permitWithoutStream = inputs.otlpKeepalivePermitWithoutStreamInput.value;

  return {
    ...base,
    protocol: otlpProtocol.Grpc,
    compression: inputs.otlpCompressionInput.value as OtlpGrpcExporterConfig['compression'],
    balancer_name: text(inputs.otlpBalancerNameInput),
    keepalive:
      keepaliveTime || keepaliveTimeout || permitWithoutStream
        ? {
            time: keepaliveTime,
            timeout: keepaliveTimeout,
            permit_without_stream: permitWithoutStream,
          }
        : null,
    read_buffer_size: integer(inputs.otlpReadBufferSizeInput),
    write_buffer_size: integer(inputs.otlpWriteBufferSizeInput),
    wait_for_ready: inputs.otlpWaitForReadyInput.value,
    user_agent: text(inputs.otlpUserAgentInput),
    authority: text(inputs.otlpAuthorityInput),
  };
}
