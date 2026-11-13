/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NewOtlpOutput,
  OtlpExporterConfig,
  OtlpGrpcExporterConfig,
  OtlpHttpExporterConfig,
} from '../../../../../../../common/types/models';
import {
  OTLP_GRPC_ONLY_COMPRESSION_TYPES,
  otlpCompressionType,
  otlpProtocol,
} from '../../../../../../../common/constants';

import { useInput, useKeyValueInput, useSwitchInput } from '../../../../hooks';

import {
  validateOtlpByteSize,
  validateOtlpCompressionLevel,
  validateOtlpCount,
  validateOtlpDuration,
  validateOtlpEndpoint,
  validateOtlpHeaders,
  validateOtlpShortString,
  validateOtlpUrl,
} from './output_form_validators';

type OtlpProtocol = OtlpExporterConfig['protocol'];
type OtlpHttpEncoding = NonNullable<OtlpHttpExporterConfig['encoding']>;

export const OTLP_HTTP_DEFAULT_ENCODING: OtlpHttpEncoding = 'proto';
// the spec enables it by default, so the switch is on unless an output turned it off
const OTLP_HTTP_DEFAULT_FORCE_ATTEMPT_HTTP2 = true;

const headersToRows = (
  headers: Record<string, string> | null | undefined
): Array<{ key: string; value: string }> => {
  const rows = Object.entries(headers ?? {}).map(([key, value]) => ({ key, value }));
  return rows.length ? rows : [{ key: '', value: '' }];
};

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
    validateIfSelected(validateOtlpEndpoint),
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
    validateIfSelected(validateOtlpUrl),
    disabled
  );
  const otlpMetricsEndpointInput = useInput(
    toInputValue(http?.metrics_endpoint),
    validateIfSelected(validateOtlpUrl),
    disabled
  );
  const otlpLogsEndpointInput = useInput(
    toInputValue(http?.logs_endpoint),
    validateIfSelected(validateOtlpUrl),
    disabled
  );
  const otlpProfilesEndpointInput = useInput(
    toInputValue(http?.profiles_endpoint),
    validateIfSelected(validateOtlpUrl),
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
    validateIfSelected(validateOtlpUrl),
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
  ].every(Boolean);

// An update is deep merged into the stored output, so a cleared setting is sent as `null` to
// remove the stored value rather than left out.
const text = (input: { value?: string }) => input.value?.trim() || null;
const integer = (input: { value?: string }) => {
  const value = input.value?.trim();
  return value ? Number(value) : null;
};

/**
 * Builds the `otlp_exporter` of the payload from the settings this form edits. The settings it
 * does not edit yet (TLS, sending queue, retry) are left out, so an update keeps them.
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
