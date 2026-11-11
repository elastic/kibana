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
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { otlpCompressionType } from '../../../../../../../common/constants';

import type { useInput, useSwitchInput } from '../../../../hooks';

import type { OutputFormInputsType } from './use_output_form';
import { isOtlpGrpc } from './use_otlp_inputs';
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
          values={{ specLink: <OtlpSpecLink specUrl={OTEL_SPEC_URLS.configGrpc} /> }}
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

const GrpcSettings: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({ inputs }) => {
  const hasGrpcSettings =
    [
      inputs.otlpBalancerNameInput,
      inputs.otlpKeepaliveTimeInput,
      inputs.otlpKeepaliveTimeoutInput,
      inputs.otlpReadBufferSizeInput,
      inputs.otlpWriteBufferSizeInput,
      inputs.otlpUserAgentInput,
      inputs.otlpAuthorityInput,
    ].some((input) => !!input.value) ||
    inputs.otlpKeepalivePermitWithoutStreamInput.value ||
    inputs.otlpWaitForReadyInput.value;

  return (
    <EuiAccordion
      id="otlpGrpcSettings"
      data-test-subj="settingsOutputsFlyout.otlpGrpcSettings"
      initialIsOpen={hasGrpcSettings}
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

export const OutputFormOtlpSection: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({
  inputs,
}) => {
  const isGrpc = isOtlpGrpc(inputs);

  return (
    <>
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
        helpText={<OtlpSpecDefaultHint defaultValue="5s" specUrl={OTEL_SPEC_URLS.exporterHelper} />}
        input={inputs.otlpTimeoutInput}
        testSubj="otlpTimeoutInput"
        placeholder="5s"
      />
      <Headers inputs={inputs} />
      {isGrpc && (
        <>
          <EuiSpacer size="m" />
          <GrpcSettings inputs={inputs} />
        </>
      )}
      <EuiSpacer size="m" />
    </>
  );
};
