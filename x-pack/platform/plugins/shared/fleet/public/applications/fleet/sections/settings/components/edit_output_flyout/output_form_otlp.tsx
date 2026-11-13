/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCode,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiFormRow,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { otlpCompressionType, otlpProtocol } from '../../../../../../../common/constants';

import type { useInput, useSwitchInput } from '../../../../hooks';

import type { OutputFormInputsType } from './use_output_form';
import {
  changeOtlpProtocol,
  hasOtlpGrpcSettings,
  hasOtlpHttpSettings,
  isOtlpGrpc,
} from './use_otlp_inputs';
import { OTEL_SPEC_URLS, OtlpSpecDefaultHint, OtlpSpecLink } from './otlp_spec';

type HeadersErrors = Array<{
  message: string;
  index: number;
  hasKeyError: boolean;
  hasValueError: boolean;
}>;

const GRPC_COMPRESSION_OPTIONS = [
  otlpCompressionType.Gzip,
  otlpCompressionType.Snappy,
  otlpCompressionType.Zstd,
  otlpCompressionType.None,
].map((value) => ({ value, text: value }));

const HTTP_COMPRESSION_OPTIONS = [otlpCompressionType.Gzip, otlpCompressionType.None].map(
  (value) => ({ value, text: value })
);

const HTTP_ENCODING_OPTIONS = ['proto', 'json'].map((value) => ({ value, text: value }));

const PROTOCOL_OPTIONS = [
  { id: 'otlpProtocolGrpc', value: otlpProtocol.Grpc, label: 'gRPC' },
  { id: 'otlpProtocolHttpProtobuf', value: otlpProtocol.HttpProtobuf, label: 'HTTP/Protobuf' },
];

const TextSetting: React.FunctionComponent<{
  label: React.ReactNode;
  helpText: React.ReactNode;
  input: ReturnType<typeof useInput>;
  testSubj: string;
  placeholder?: string;
}> = ({ label, helpText, input, testSubj, placeholder }) => (
  <EuiFormRow fullWidth label={label} helpText={helpText} {...input.formRowProps}>
    <EuiFieldText
      fullWidth
      data-test-subj={`settingsOutputsFlyout.${testSubj}`}
      placeholder={placeholder}
      {...input.props}
      // validate when leaving the field, not only on save
      onBlur={() => input.validate()}
    />
  </EuiFormRow>
);

const SwitchSetting: React.FunctionComponent<{
  label: React.ReactNode;
  helpText: React.ReactNode;
  input: ReturnType<typeof useSwitchInput>;
  testSubj: string;
}> = ({ label, helpText, input, testSubj }) => (
  <EuiFormRow fullWidth helpText={helpText} {...input.formRowProps}>
    <EuiSwitch
      label={label}
      data-test-subj={`settingsOutputsFlyout.${testSubj}`}
      {...input.props}
    />
  </EuiFormRow>
);

const Headers: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({ inputs }) => {
  const {
    props: { onChange, disabled },
    value: rows,
    formRowProps: { error },
  } = inputs.otlpHeadersInput;
  const errors = error as HeadersErrors | undefined;
  const deleteHeaderLabel = i18n.translate(
    'xpack.fleet.settings.editOutputFlyout.otlpHeaderDeleteAriaLabel',
    { defaultMessage: 'Delete header' }
  );

  const updateRow = useCallback(
    (index: number, field: 'key' | 'value', value: string) => {
      onChange(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    },
    [rows, onChange]
  );

  return (
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpHeadersLabel"
          defaultMessage="Headers (optional)"
        />
      }
      helpText={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpHeadersHelpText"
          defaultMessage="Name/value pairs added to every request. Default: none. See the {specLink}."
          values={{
            specLink: (
              <OtlpSpecLink
                specUrl={isOtlpGrpc(inputs) ? OTEL_SPEC_URLS.configGrpc : OTEL_SPEC_URLS.configHttp}
              />
            ),
          }}
        />
      }
    >
      <>
        {rows.map((row, index) => {
          const rowErrors = errors?.filter((e) => e.index === index) ?? [];
          return (
            <React.Fragment key={index}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem>
                  <EuiFieldText
                    compressed
                    fullWidth
                    disabled={disabled}
                    isInvalid={rowErrors.some((e) => e.hasKeyError)}
                    value={row.key}
                    onChange={(e) => updateRow(index, 'key', e.target.value)}
                    onBlur={() => inputs.otlpHeadersInput.validate()}
                    aria-label={i18n.translate(
                      'xpack.fleet.settings.editOutputFlyout.otlpHeaderNameAriaLabel',
                      { defaultMessage: 'Header name' }
                    )}
                    placeholder={i18n.translate(
                      'xpack.fleet.settings.editOutputFlyout.otlpHeaderNamePlaceholder',
                      { defaultMessage: 'Name' }
                    )}
                    data-test-subj={`settingsOutputsFlyout.otlpHeaderName${index}`}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFieldText
                    compressed
                    fullWidth
                    disabled={disabled}
                    isInvalid={rowErrors.some((e) => e.hasValueError)}
                    value={row.value}
                    onChange={(e) => updateRow(index, 'value', e.target.value)}
                    onBlur={() => inputs.otlpHeadersInput.validate()}
                    aria-label={i18n.translate(
                      'xpack.fleet.settings.editOutputFlyout.otlpHeaderValueAriaLabel',
                      { defaultMessage: 'Header value' }
                    )}
                    placeholder={i18n.translate(
                      'xpack.fleet.settings.editOutputFlyout.otlpHeaderValuePlaceholder',
                      { defaultMessage: 'Value' }
                    )}
                    data-test-subj={`settingsOutputsFlyout.otlpHeaderValue${index}`}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={deleteHeaderLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="trash"
                      color="danger"
                      isDisabled={disabled || rows.length === 1}
                      onClick={() => onChange(rows.filter((_, i) => i !== index))}
                      aria-label={deleteHeaderLabel}
                      data-test-subj={`settingsOutputsFlyout.otlpHeaderDelete${index}`}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
              {rowErrors.map(({ message }) => (
                <EuiFormErrorText key={message}>{message}</EuiFormErrorText>
              ))}
              <EuiSpacer size="xs" />
            </React.Fragment>
          );
        })}
        <EuiButtonEmpty
          size="xs"
          iconType="plusCircle"
          isDisabled={disabled}
          onClick={() => onChange([...rows, { key: '', value: '' }])}
          data-test-subj="settingsOutputsFlyout.otlpAddHeader"
        >
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpAddHeader"
            defaultMessage="Add header"
          />
        </EuiButtonEmpty>
      </>
    </EuiFormRow>
  );
};

const keepaliveDisabledDefault = (
  <FormattedMessage
    id="xpack.fleet.settings.editOutputFlyout.otlpKeepaliveDisabledDefault"
    defaultMessage="not set, keepalive pings are disabled"
  />
);

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
        defaultMessage="Changing the protocol resets the settings of the previous protocol. See the {grpcSpecLink} and the {httpSpecLink}."
        values={{
          grpcSpecLink: <OtlpSpecLink specUrl={OTEL_SPEC_URLS.otlpExporter} />,
          httpSpecLink: <OtlpSpecLink specUrl={OTEL_SPEC_URLS.otlpHttpExporter} />,
        }}
      />
    }
  >
    <EuiRadioGroup
      name="otlpProtocol"
      style={{ display: 'flex', gap: 30 }}
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

const GrpcSettings: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({ inputs }) => {
  return (
    <EuiAccordion
      id="otlpGrpcSettings"
      data-test-subj="settingsOutputsFlyout.otlpGrpcSettings"
      initialIsOpen={hasOtlpGrpcSettings(inputs)}
      paddingSize="m"
      buttonContent={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpGrpcSettingsLabel"
          defaultMessage="gRPC settings"
        />
      }
    >
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpBalancerNameLabel"
            defaultMessage="Load balancer (optional)"
          />
        }
        helpText={
          <OtlpSpecDefaultHint defaultValue="round_robin" specUrl={OTEL_SPEC_URLS.configGrpc} />
        }
        input={inputs.otlpBalancerNameInput}
        testSubj="otlpBalancerNameInput"
        placeholder="round_robin"
      />
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpKeepaliveTimeLabel"
            defaultMessage="Keepalive time (optional)"
          />
        }
        helpText={
          <OtlpSpecDefaultHint
            defaultText={keepaliveDisabledDefault}
            specUrl={OTEL_SPEC_URLS.configGrpc}
          />
        }
        input={inputs.otlpKeepaliveTimeInput}
        testSubj="otlpKeepaliveTimeInput"
        placeholder="10s"
      />
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpKeepaliveTimeoutLabel"
            defaultMessage="Keepalive timeout (optional)"
          />
        }
        helpText={
          <OtlpSpecDefaultHint
            defaultText={keepaliveDisabledDefault}
            specUrl={OTEL_SPEC_URLS.configGrpc}
          />
        }
        input={inputs.otlpKeepaliveTimeoutInput}
        testSubj="otlpKeepaliveTimeoutInput"
        placeholder="10s"
      />
      <SwitchSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpKeepalivePermitWithoutStreamLabel"
            defaultMessage="Send keepalive pings without active streams"
          />
        }
        helpText={<OtlpSpecDefaultHint defaultValue="false" specUrl={OTEL_SPEC_URLS.configGrpc} />}
        input={inputs.otlpKeepalivePermitWithoutStreamInput}
        testSubj="otlpKeepalivePermitWithoutStreamInput"
      />
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpReadBufferSizeLabel"
            defaultMessage="Read buffer size in bytes (optional)"
          />
        }
        helpText={
          <OtlpSpecDefaultHint
            defaultText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.otlpReadBufferSizeDefault"
                defaultMessage="the gRPC library default"
              />
            }
            specUrl={OTEL_SPEC_URLS.configGrpc}
          />
        }
        input={inputs.otlpReadBufferSizeInput}
        testSubj="otlpReadBufferSizeInput"
      />
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpWriteBufferSizeLabel"
            defaultMessage="Write buffer size in bytes (optional)"
          />
        }
        helpText={
          <OtlpSpecDefaultHint defaultValue="524288" specUrl={OTEL_SPEC_URLS.otlpExporter} />
        }
        input={inputs.otlpWriteBufferSizeInput}
        testSubj="otlpWriteBufferSizeInput"
        placeholder="524288"
      />
      <SwitchSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpWaitForReadyLabel"
            defaultMessage="Wait for the connection to be ready before sending data"
          />
        }
        helpText={<OtlpSpecDefaultHint defaultValue="false" specUrl={OTEL_SPEC_URLS.configGrpc} />}
        input={inputs.otlpWaitForReadyInput}
        testSubj="otlpWaitForReadyInput"
      />
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpUserAgentLabel"
            defaultMessage="User agent (optional)"
          />
        }
        helpText={
          <OtlpSpecDefaultHint
            defaultText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.otlpUserAgentDefault"
                defaultMessage="the collector name and version"
              />
            }
            specUrl={OTEL_SPEC_URLS.configGrpc}
          />
        }
        input={inputs.otlpUserAgentInput}
        testSubj="otlpUserAgentInput"
      />
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpAuthorityLabel"
            defaultMessage="Authority (optional)"
          />
        }
        helpText={
          <OtlpSpecDefaultHint
            defaultText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.otlpAuthorityDefault"
                defaultMessage="the host of the endpoint"
              />
            }
            specUrl={OTEL_SPEC_URLS.configGrpc}
          />
        }
        input={inputs.otlpAuthorityInput}
        testSubj="otlpAuthorityInput"
      />
    </EuiAccordion>
  );
};

const signalEndpointDefault = (path: string) => (
  <FormattedMessage
    id="xpack.fleet.settings.editOutputFlyout.otlpSignalEndpointDefault"
    defaultMessage="the endpoint followed by {path}"
    values={{ path: <EuiCode>{path}</EuiCode> }}
  />
);

const SIGNAL_ENDPOINTS = [
  {
    inputKey: 'otlpTracesEndpointInput',
    testSubj: 'otlpTracesEndpointInput',
    path: '/v1/traces',
    label: (
      <FormattedMessage
        id="xpack.fleet.settings.editOutputFlyout.otlpTracesEndpointLabel"
        defaultMessage="Traces endpoint (optional)"
      />
    ),
  },
  {
    inputKey: 'otlpMetricsEndpointInput',
    testSubj: 'otlpMetricsEndpointInput',
    path: '/v1/metrics',
    label: (
      <FormattedMessage
        id="xpack.fleet.settings.editOutputFlyout.otlpMetricsEndpointLabel"
        defaultMessage="Metrics endpoint (optional)"
      />
    ),
  },
  {
    inputKey: 'otlpLogsEndpointInput',
    testSubj: 'otlpLogsEndpointInput',
    path: '/v1/logs',
    label: (
      <FormattedMessage
        id="xpack.fleet.settings.editOutputFlyout.otlpLogsEndpointLabel"
        defaultMessage="Logs endpoint (optional)"
      />
    ),
  },
  {
    inputKey: 'otlpProfilesEndpointInput',
    testSubj: 'otlpProfilesEndpointInput',
    path: '/v1development/profiles',
    label: (
      <FormattedMessage
        id="xpack.fleet.settings.editOutputFlyout.otlpProfilesEndpointLabel"
        defaultMessage="Profiles endpoint (optional)"
      />
    ),
  },
] as const;

const HttpSettings: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({ inputs }) => {
  return (
    <EuiAccordion
      id="otlpHttpSettings"
      data-test-subj="settingsOutputsFlyout.otlpHttpSettings"
      initialIsOpen={hasOtlpHttpSettings(inputs)}
      paddingSize="m"
      buttonContent={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpHttpSettingsLabel"
          defaultMessage="HTTP settings"
        />
      }
    >
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpEncodingLabel"
            defaultMessage="Encoding"
          />
        }
        helpText={
          <OtlpSpecDefaultHint defaultValue="proto" specUrl={OTEL_SPEC_URLS.otlpHttpExporter} />
        }
      >
        <EuiSelect
          fullWidth
          data-test-subj="settingsOutputsFlyout.otlpEncodingInput"
          {...inputs.otlpEncodingInput.props}
          options={HTTP_ENCODING_OPTIONS}
        />
      </EuiFormRow>
      {SIGNAL_ENDPOINTS.map(({ inputKey, testSubj, path, label }) => (
        <TextSetting
          key={inputKey}
          label={label}
          helpText={
            <OtlpSpecDefaultHint
              defaultText={signalEndpointDefault(path)}
              specUrl={OTEL_SPEC_URLS.otlpHttpExporter}
            />
          }
          input={inputs[inputKey]}
          testSubj={testSubj}
          placeholder={`https://collector.example.com:4318${path}`}
        />
      ))}
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpProxyUrlLabel"
            defaultMessage="Proxy URL (optional)"
          />
        }
        helpText={
          <OtlpSpecDefaultHint
            defaultText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.otlpProxyUrlDefault"
                defaultMessage="none, requests are sent directly"
              />
            }
            specUrl={OTEL_SPEC_URLS.configHttp}
          />
        }
        input={inputs.otlpProxyUrlInput}
        testSubj="otlpProxyUrlInput"
        placeholder="http://proxy.example.com:3128"
      />
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpHttpReadBufferSizeLabel"
            defaultMessage="Read buffer size in bytes (optional)"
          />
        }
        helpText={
          <OtlpSpecDefaultHint defaultValue="0" specUrl={OTEL_SPEC_URLS.otlpHttpExporter} />
        }
        input={inputs.otlpHttpReadBufferSizeInput}
        testSubj="otlpHttpReadBufferSizeInput"
        placeholder="0"
      />
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpHttpWriteBufferSizeLabel"
            defaultMessage="Write buffer size in bytes (optional)"
          />
        }
        helpText={
          <OtlpSpecDefaultHint defaultValue="524288" specUrl={OTEL_SPEC_URLS.otlpHttpExporter} />
        }
        input={inputs.otlpHttpWriteBufferSizeInput}
        testSubj="otlpHttpWriteBufferSizeInput"
        placeholder="524288"
      />
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpMaxIdleConnsLabel"
            defaultMessage="Maximum idle connections (optional)"
          />
        }
        helpText={<OtlpSpecDefaultHint defaultValue="100" specUrl={OTEL_SPEC_URLS.configHttp} />}
        input={inputs.otlpMaxIdleConnsInput}
        testSubj="otlpMaxIdleConnsInput"
        placeholder="100"
      />
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpMaxIdleConnsPerHostLabel"
            defaultMessage="Maximum idle connections per host (optional)"
          />
        }
        helpText={
          <OtlpSpecDefaultHint
            defaultText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.otlpMaxIdleConnsPerHostDefault"
                defaultMessage="not set, the Go HTTP client default of 2 is used"
              />
            }
            specUrl={OTEL_SPEC_URLS.configHttp}
          />
        }
        input={inputs.otlpMaxIdleConnsPerHostInput}
        testSubj="otlpMaxIdleConnsPerHostInput"
      />
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpMaxConnsPerHostLabel"
            defaultMessage="Maximum connections per host (optional)"
          />
        }
        helpText={
          <OtlpSpecDefaultHint
            defaultText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.otlpMaxConnsPerHostDefault"
                defaultMessage="not set, the number of connections is not limited"
              />
            }
            specUrl={OTEL_SPEC_URLS.configHttp}
          />
        }
        input={inputs.otlpMaxConnsPerHostInput}
        testSubj="otlpMaxConnsPerHostInput"
      />
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpIdleConnTimeoutLabel"
            defaultMessage="Idle connection timeout (optional)"
          />
        }
        helpText={<OtlpSpecDefaultHint defaultValue="90s" specUrl={OTEL_SPEC_URLS.configHttp} />}
        input={inputs.otlpIdleConnTimeoutInput}
        testSubj="otlpIdleConnTimeoutInput"
        placeholder="90s"
      />
      <SwitchSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpDisableKeepAlivesLabel"
            defaultMessage="Disable keep-alives and use a new connection for every request"
          />
        }
        helpText={<OtlpSpecDefaultHint defaultValue="false" specUrl={OTEL_SPEC_URLS.configHttp} />}
        input={inputs.otlpDisableKeepAlivesInput}
        testSubj="otlpDisableKeepAlivesInput"
      />
      <SwitchSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpForceAttemptHttp2Label"
            defaultMessage="Attempt to use HTTP/2"
          />
        }
        helpText={<OtlpSpecDefaultHint defaultValue="true" specUrl={OTEL_SPEC_URLS.configHttp} />}
        input={inputs.otlpForceAttemptHttp2Input}
        testSubj="otlpForceAttemptHttp2Input"
      />
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpHttp2ReadIdleTimeoutLabel"
            defaultMessage="HTTP/2 read idle timeout (optional)"
          />
        }
        helpText={
          <OtlpSpecDefaultHint
            defaultText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.otlpHttp2ReadIdleTimeoutDefault"
                defaultMessage="not set, health check pings are disabled"
              />
            }
            specUrl={OTEL_SPEC_URLS.configHttp}
          />
        }
        input={inputs.otlpHttp2ReadIdleTimeoutInput}
        testSubj="otlpHttp2ReadIdleTimeoutInput"
        placeholder="10s"
      />
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpHttp2PingTimeoutLabel"
            defaultMessage="HTTP/2 ping timeout (optional)"
          />
        }
        helpText={<OtlpSpecDefaultHint defaultValue="15s" specUrl={OTEL_SPEC_URLS.configHttp} />}
        input={inputs.otlpHttp2PingTimeoutInput}
        testSubj="otlpHttp2PingTimeoutInput"
        placeholder="15s"
      />
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpCompressionLevelLabel"
            defaultMessage="Compression level (optional)"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpCompressionLevelHelpText"
            defaultMessage="Applies to {gzip} compression, from {min} to {max}. {defaultHint}"
            values={{
              gzip: <EuiCode>{otlpCompressionType.Gzip}</EuiCode>,
              min: <EuiCode>-2</EuiCode>,
              max: <EuiCode>9</EuiCode>,
              defaultHint: (
                <OtlpSpecDefaultHint
                  defaultText={
                    <FormattedMessage
                      id="xpack.fleet.settings.editOutputFlyout.otlpCompressionLevelDefault"
                      defaultMessage="the default level of the compression"
                    />
                  }
                  specUrl={OTEL_SPEC_URLS.configHttp}
                />
              ),
            }}
          />
        }
        input={inputs.otlpCompressionLevelInput}
        testSubj="otlpCompressionLevelInput"
      />
      <SwitchSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpCookiesEnabledLabel"
            defaultMessage="Store the cookies of the responses and send them in later requests"
          />
        }
        helpText={<OtlpSpecDefaultHint defaultValue="false" specUrl={OTEL_SPEC_URLS.configHttp} />}
        input={inputs.otlpCookiesEnabledInput}
        testSubj="otlpCookiesEnabledInput"
      />
    </EuiAccordion>
  );
};

export const OutputFormOtlpSection: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({
  inputs,
}) => {
  const isGrpc = isOtlpGrpc(inputs);

  return (
    <>
      <Protocol inputs={inputs} />
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpEndpointLabel"
            defaultMessage="Endpoint"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpEndpointHelpText"
            defaultMessage="Host and port of the OTLP receiver, such as {example}. Default: none. See the {specLink}."
            values={{
              example: isGrpc ? 'collector.example.com:4317' : 'https://collector.example.com:4318',
              specLink: (
                <OtlpSpecLink
                  specUrl={isGrpc ? OTEL_SPEC_URLS.otlpExporter : OTEL_SPEC_URLS.otlpHttpExporter}
                />
              ),
            }}
          />
        }
        input={inputs.otlpEndpointInput}
        testSubj="otlpEndpointInput"
        placeholder={isGrpc ? 'collector.example.com:4317' : 'https://collector.example.com:4318'}
      />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpCompressionLabel"
            defaultMessage="Compression"
          />
        }
        helpText={
          <OtlpSpecDefaultHint
            defaultValue={otlpCompressionType.Gzip}
            specUrl={isGrpc ? OTEL_SPEC_URLS.otlpExporter : OTEL_SPEC_URLS.otlpHttpExporter}
          />
        }
      >
        <EuiSelect
          fullWidth
          data-test-subj="settingsOutputsFlyout.otlpCompressionInput"
          {...inputs.otlpCompressionInput.props}
          options={isGrpc ? GRPC_COMPRESSION_OPTIONS : HTTP_COMPRESSION_OPTIONS}
        />
      </EuiFormRow>
      <TextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpTimeoutLabel"
            defaultMessage="Timeout (optional)"
          />
        }
        helpText={
          isGrpc ? (
            <OtlpSpecDefaultHint defaultValue="5s" specUrl={OTEL_SPEC_URLS.exporterHelper} />
          ) : (
            <OtlpSpecDefaultHint defaultValue="30s" specUrl={OTEL_SPEC_URLS.otlpHttpExporter} />
          )
        }
        input={inputs.otlpTimeoutInput}
        testSubj="otlpTimeoutInput"
        placeholder={isGrpc ? '5s' : '30s'}
      />
      <Headers inputs={inputs} />
      <EuiSpacer size="m" />
      {isGrpc ? <GrpcSettings inputs={inputs} /> : <HttpSettings inputs={inputs} />}
      <EuiSpacer size="m" />
    </>
  );
};
