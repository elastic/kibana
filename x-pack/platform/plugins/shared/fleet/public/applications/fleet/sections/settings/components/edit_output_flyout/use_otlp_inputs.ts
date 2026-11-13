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
import { otlpCompressionType, otlpProtocol } from '../../../../../../../common/constants';

import { useInput, useKeyValueInput, useSwitchInput } from '../../../../hooks';

import {
  validateOtlpByteSize,
  validateOtlpDuration,
  validateOtlpEndpoint,
  validateOtlpHeaders,
  validateOtlpShortString,
} from './output_form_validators';

const headersToRows = (
  headers: Record<string, string> | null | undefined
): Array<{ key: string; value: string }> => {
  const rows = Object.entries(headers ?? {}).map(([key, value]) => ({ key, value }));
  return rows.length ? rows : [{ key: '', value: '' }];
};

const toInputValue = (value: string | number | null | undefined) =>
  value === null || value === undefined ? '' : `${value}`;

/** The inputs of the OTLP output: the settings shared by both protocols, and the gRPC ones. */
export function useOtlpInputs(
  otlpOutput: NewOtlpOutput | undefined,
  isSelected: boolean,
  disabled: boolean
) {
  const exporter = otlpOutput?.otlp_exporter;
  const grpc: Partial<OtlpGrpcExporterConfig> | undefined =
    exporter?.protocol === otlpProtocol.Grpc ? exporter : undefined;
  const validateIfSelected = <T>(validator: T) => (isSelected ? validator : undefined);

  // No protocol selector yet: an output keeps its protocol, and a new one uses gRPC.
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
  };
}

export type OtlpInputs = ReturnType<typeof useOtlpInputs>;

export const isOtlpGrpc = (inputs: OtlpInputs) =>
  inputs.otlpProtocolInput.value === otlpProtocol.Grpc;

/** Validates every input, so all the errors are shown. Returns whether they are all valid. */
export const validateOtlpInputs = (inputs: OtlpInputs): boolean =>
  [
    inputs.otlpEndpointInput.validate(),
    inputs.otlpTimeoutInput.validate(),
    inputs.otlpHeadersInput.validate(),
    ...(isOtlpGrpc(inputs)
      ? [
          inputs.otlpBalancerNameInput.validate(),
          inputs.otlpKeepaliveTimeInput.validate(),
          inputs.otlpKeepaliveTimeoutInput.validate(),
          inputs.otlpReadBufferSizeInput.validate(),
          inputs.otlpWriteBufferSizeInput.validate(),
          inputs.otlpUserAgentInput.validate(),
          inputs.otlpAuthorityInput.validate(),
        ]
      : []),
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
    return {
      ...base,
      protocol: otlpProtocol.HttpProtobuf,
      compression: inputs.otlpCompressionInput.value as OtlpHttpExporterConfig['compression'],
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
