/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiRadioGroup, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { otlpCompressionType, otlpProtocol } from '../../../../../../../common/constants';

import type { OutputFormInputsType } from './use_output_form';
import { changeOtlpProtocol, isOtlpGrpc } from './use_otlp_inputs';
import { OtlpDefaultHint, OtlpSpecLinks } from './otlp_spec';
import { OtlpSelectSetting, OtlpTextSetting } from './otlp_setting_fields';
import { OtlpHeaders } from './output_form_otlp_headers';
import { OtlpGrpcSettings } from './output_form_otlp_grpc';
import { OtlpHttpSettings } from './output_form_otlp_http';

const GRPC_COMPRESSION_OPTIONS = [
  otlpCompressionType.Gzip,
  otlpCompressionType.Snappy,
  otlpCompressionType.Zstd,
  otlpCompressionType.None,
].map((value) => ({ value, text: value }));

const HTTP_COMPRESSION_OPTIONS = [otlpCompressionType.Gzip, otlpCompressionType.None].map(
  (value) => ({ value, text: value })
);

const PROTOCOL_OPTIONS = [
  { id: 'otlpProtocolGrpc', value: otlpProtocol.Grpc, label: 'gRPC' },
  { id: 'otlpProtocolHttpProtobuf', value: otlpProtocol.HttpProtobuf, label: 'HTTP/Protobuf' },
];

const Protocol: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({ inputs }) => (
  <EuiFormRow
    fullWidth
    label={
      <FormattedMessage
        id="xpack.fleet.settings.editOutputFlyout.otlpProtocolLabel"
        defaultMessage="Protocol"
      />
    }
    helpText={
      <FormattedMessage
        id="xpack.fleet.settings.editOutputFlyout.otlpProtocolHelpText"
        defaultMessage="Changing the protocol resets the settings of the previous protocol. {specLinks}"
        values={{
          specLinks: (
            <OtlpSpecLinks specs={['otlpExporter', 'otlpHttpExporter', 'exporterHelper']} />
          ),
        }}
      />
    }
  >
    <EuiRadioGroup
      name="otlpProtocol"
      data-test-subj="settingsOutputsFlyout.otlpProtocolInput"
      compressed
      disabled={inputs.otlpProtocolInput.props.disabled}
      options={PROTOCOL_OPTIONS.map(({ id, label }) => ({
        id,
        label,
        'data-test-subj': `settingsOutputsFlyout.${id}`,
      }))}
      idSelected={
        PROTOCOL_OPTIONS.find(({ value }) => value === inputs.otlpProtocolInput.value)?.id
      }
      onChange={(id) => {
        const option = PROTOCOL_OPTIONS.find((protocolOption) => protocolOption.id === id);
        if (option) {
          changeOtlpProtocol(inputs, option.value);
        }
      }}
    />
  </EuiFormRow>
);

export const OutputFormOtlpSection: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({
  inputs,
}) => {
  const isGrpc = isOtlpGrpc(inputs);

  return (
    <>
      <Protocol inputs={inputs} />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpEndpointLabel"
            defaultMessage="Endpoint"
          />
        }
        helpText={
          isGrpc ? (
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpGrpcEndpointHelpText"
              defaultMessage="Host and port of the OTLP receiver, such as {example}. Default: none."
              values={{ example: 'collector.example.com:4317' }}
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpHttpEndpointHelpText"
              defaultMessage="Base URL of the OTLP receiver, such as {example}. Default: none."
              values={{ example: 'https://collector.example.com:4318' }}
            />
          )
        }
        input={inputs.otlpEndpointInput}
        testSubj="otlpEndpointInput"
        placeholder={isGrpc ? 'collector.example.com:4317' : 'https://collector.example.com:4318'}
      />
      <OtlpSelectSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpCompressionLabel"
            defaultMessage="Compression"
          />
        }
        helpText={<OtlpDefaultHint defaultValue={otlpCompressionType.Gzip} />}
        input={inputs.otlpCompressionInput}
        testSubj="otlpCompressionInput"
        options={isGrpc ? GRPC_COMPRESSION_OPTIONS : HTTP_COMPRESSION_OPTIONS}
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpTimeoutLabel"
            defaultMessage="Timeout (optional)"
          />
        }
        helpText={<OtlpDefaultHint defaultValue={isGrpc ? '5s' : '30s'} />}
        input={inputs.otlpTimeoutInput}
        testSubj="otlpTimeoutInput"
        placeholder={isGrpc ? '5s' : '30s'}
      />
      <OtlpHeaders inputs={inputs} />
      <EuiSpacer size="m" />
      {isGrpc ? <OtlpGrpcSettings inputs={inputs} /> : <OtlpHttpSettings inputs={inputs} />}
      <EuiSpacer size="m" />
    </>
  );
};
