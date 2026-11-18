/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiAccordion, EuiButtonGroup, EuiCode, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { otlpCompressionType } from '../../../../../../../common/constants';

import type { OutputFormInputsType } from './use_output_form';
import { hasOtlpHttpSettings } from './use_otlp_inputs';
import { OtlpDefaultHint } from './otlp_spec';
import {
  OtlpSelectSetting,
  OtlpSettingsGroup,
  OtlpSettingsSpecs,
  OtlpSwitchSetting,
  OtlpTextSetting,
} from './otlp_setting_fields';

const HTTP_ENCODING_OPTIONS = ['proto', 'json'].map((value) => ({ value, text: value }));

type SignalEndpointInputKey =
  | 'otlpTracesEndpointInput'
  | 'otlpMetricsEndpointInput'
  | 'otlpLogsEndpointInput'
  | 'otlpProfilesEndpointInput';

const SIGNAL_ENDPOINTS: Array<{
  id: string;
  inputKey: SignalEndpointInputKey;
  path: string;
  signal: string;
  label: React.ReactNode;
}> = [
  {
    id: 'otlpTracesEndpoint',
    inputKey: 'otlpTracesEndpointInput',
    path: '/v1/traces',
    signal: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpSignalTraces', {
      defaultMessage: 'Traces',
    }),
    label: (
      <FormattedMessage
        id="xpack.fleet.settings.editOutputFlyout.otlpTracesEndpointLabel"
        defaultMessage="Traces endpoint"
      />
    ),
  },
  {
    id: 'otlpMetricsEndpoint',
    inputKey: 'otlpMetricsEndpointInput',
    path: '/v1/metrics',
    signal: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpSignalMetrics', {
      defaultMessage: 'Metrics',
    }),
    label: (
      <FormattedMessage
        id="xpack.fleet.settings.editOutputFlyout.otlpMetricsEndpointLabel"
        defaultMessage="Metrics endpoint"
      />
    ),
  },
  {
    id: 'otlpLogsEndpoint',
    inputKey: 'otlpLogsEndpointInput',
    path: '/v1/logs',
    signal: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpSignalLogs', {
      defaultMessage: 'Logs',
    }),
    label: (
      <FormattedMessage
        id="xpack.fleet.settings.editOutputFlyout.otlpLogsEndpointLabel"
        defaultMessage="Logs endpoint"
      />
    ),
  },
  {
    id: 'otlpProfilesEndpoint',
    inputKey: 'otlpProfilesEndpointInput',
    path: '/v1development/profiles',
    signal: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpSignalProfiles', {
      defaultMessage: 'Profiles',
    }),
    label: (
      <FormattedMessage
        id="xpack.fleet.settings.editOutputFlyout.otlpProfilesEndpointLabel"
        defaultMessage="Profiles endpoint"
      />
    ),
  },
];

/**
 * Each signal is sent to the endpoint followed by the path of the signal. A signal can be sent to
 * its own URL instead: its field is shown once the signal is selected.
 */
const SignalEndpoints: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({ inputs }) => {
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SIGNAL_ENDPOINTS.map(({ id, inputKey }) => [id, !!inputs[inputKey].value]))
  );

  const toggle = (id: string) => {
    const signalEndpoint = SIGNAL_ENDPOINTS.find((endpoint) => endpoint.id === id);
    if (!signalEndpoint) {
      return;
    }
    if (selected[id]) {
      // a signal that is not selected uses the endpoint, so its URL is removed
      const input = inputs[signalEndpoint.inputKey];
      input.setValue('');
      input.setErrors(undefined);
    }
    setSelected({ ...selected, [id]: !selected[id] });
  };

  return (
    <>
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpSignalEndpointsLabel"
            defaultMessage="Endpoint overrides (optional)"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpSignalEndpointsHelpText"
            defaultMessage="Select the signals to send to their own URL. Other signals are sent to the endpoint followed by the path of the signal, such as {path}."
            values={{ path: <EuiCode>/v1/traces</EuiCode> }}
          />
        }
      >
        <EuiButtonGroup
          type="multi"
          buttonSize="compressed"
          isDisabled={inputs.otlpTracesEndpointInput.props.disabled}
          legend={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.otlpSignalEndpointsLegend',
            { defaultMessage: 'Signals with their own endpoint' }
          )}
          options={SIGNAL_ENDPOINTS.map(({ id, signal }) => ({
            id,
            label: signal,
            'data-test-subj': `settingsOutputsFlyout.${id}Toggle`,
          }))}
          idToSelectedMap={selected}
          onChange={toggle}
          data-test-subj="settingsOutputsFlyout.otlpSignalEndpoints"
        />
      </EuiFormRow>
      {SIGNAL_ENDPOINTS.filter(({ id }) => selected[id]).map(({ id, inputKey, path, label }) => (
        <OtlpTextSetting
          key={id}
          label={label}
          helpText={
            <OtlpDefaultHint
              defaultText={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.otlpSignalEndpointDefault"
                  defaultMessage="the endpoint followed by {path}"
                  values={{ path: <EuiCode>{path}</EuiCode> }}
                />
              }
            />
          }
          input={inputs[inputKey]}
          testSubj={`${id}Input`}
          placeholder={`https://collector.example.com:4318${path}`}
        />
      ))}
    </>
  );
};

export const OtlpHttpSettings: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({
  inputs,
}) => (
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
    <OtlpSettingsSpecs specs={['otlpHttpExporter', 'configHttp']} />
    <OtlpSettingsGroup
      testSubj="otlpHttpSignalEndpointsGroup"
      title={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpHttpSignalEndpointsGroupTitle"
          defaultMessage="Signal endpoints"
        />
      }
    >
      <SignalEndpoints inputs={inputs} />
    </OtlpSettingsGroup>
    <OtlpSettingsGroup
      testSubj="otlpHttpRequestsGroup"
      title={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpHttpRequestsGroupTitle"
          defaultMessage="Requests"
        />
      }
    >
      <OtlpSelectSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpEncodingLabel"
            defaultMessage="Encoding"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="proto" />}
        input={inputs.otlpEncodingInput}
        testSubj="otlpEncodingInput"
        options={HTTP_ENCODING_OPTIONS}
      />
      <OtlpTextSetting
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
                <OtlpDefaultHint
                  defaultText={
                    <FormattedMessage
                      id="xpack.fleet.settings.editOutputFlyout.otlpCompressionLevelDefault"
                      defaultMessage="the default level of the compression"
                    />
                  }
                />
              ),
            }}
          />
        }
        input={inputs.otlpCompressionLevelInput}
        testSubj="otlpCompressionLevelInput"
      />
      <OtlpSwitchSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpCookiesEnabledLabel"
            defaultMessage="Store the cookies of the responses and send them in later requests"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="false" />}
        input={inputs.otlpCookiesEnabledInput}
        testSubj="otlpCookiesEnabledInput"
      />
    </OtlpSettingsGroup>
    <OtlpSettingsGroup
      testSubj="otlpHttpConnectionsGroup"
      title={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpHttpConnectionsGroupTitle"
          defaultMessage="Connections"
        />
      }
    >
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpProxyUrlLabel"
            defaultMessage="Proxy URL (optional)"
          />
        }
        helpText={
          <OtlpDefaultHint
            defaultText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.otlpProxyUrlDefault"
                defaultMessage="none, requests are sent directly"
              />
            }
          />
        }
        input={inputs.otlpProxyUrlInput}
        testSubj="otlpProxyUrlInput"
        placeholder="http://proxy.example.com:3128"
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpMaxIdleConnsLabel"
            defaultMessage="Maximum idle connections (optional)"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="100" />}
        input={inputs.otlpMaxIdleConnsInput}
        testSubj="otlpMaxIdleConnsInput"
        placeholder="100"
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpMaxIdleConnsPerHostLabel"
            defaultMessage="Maximum idle connections per host (optional)"
          />
        }
        helpText={
          <OtlpDefaultHint
            defaultText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.otlpMaxIdleConnsPerHostDefault"
                defaultMessage="not set, the Go HTTP client default of 2 is used"
              />
            }
          />
        }
        input={inputs.otlpMaxIdleConnsPerHostInput}
        testSubj="otlpMaxIdleConnsPerHostInput"
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpMaxConnsPerHostLabel"
            defaultMessage="Maximum connections per host (optional)"
          />
        }
        helpText={
          <OtlpDefaultHint
            defaultText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.otlpMaxConnsPerHostDefault"
                defaultMessage="not set, the number of connections is not limited"
              />
            }
          />
        }
        input={inputs.otlpMaxConnsPerHostInput}
        testSubj="otlpMaxConnsPerHostInput"
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpIdleConnTimeoutLabel"
            defaultMessage="Idle connection timeout (optional)"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="90s" />}
        input={inputs.otlpIdleConnTimeoutInput}
        testSubj="otlpIdleConnTimeoutInput"
        placeholder="90s"
      />
      <OtlpSwitchSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpDisableKeepAlivesLabel"
            defaultMessage="Disable keep-alives and use a new connection for every request"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="false" />}
        input={inputs.otlpDisableKeepAlivesInput}
        testSubj="otlpDisableKeepAlivesInput"
      />
    </OtlpSettingsGroup>
    <OtlpSettingsGroup
      testSubj="otlpHttp2Group"
      title={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpHttp2GroupTitle"
          defaultMessage="HTTP/2"
        />
      }
    >
      <OtlpSwitchSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpForceAttemptHttp2Label"
            defaultMessage="Attempt to use HTTP/2"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="true" />}
        input={inputs.otlpForceAttemptHttp2Input}
        testSubj="otlpForceAttemptHttp2Input"
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpHttp2ReadIdleTimeoutLabel"
            defaultMessage="HTTP/2 read idle timeout (optional)"
          />
        }
        helpText={
          <OtlpDefaultHint
            defaultText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.otlpHttp2ReadIdleTimeoutDefault"
                defaultMessage="not set, health check pings are disabled"
              />
            }
          />
        }
        input={inputs.otlpHttp2ReadIdleTimeoutInput}
        testSubj="otlpHttp2ReadIdleTimeoutInput"
        placeholder="10s"
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpHttp2PingTimeoutLabel"
            defaultMessage="HTTP/2 ping timeout (optional)"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="15s" />}
        input={inputs.otlpHttp2PingTimeoutInput}
        testSubj="otlpHttp2PingTimeoutInput"
        placeholder="15s"
      />
    </OtlpSettingsGroup>
    <OtlpSettingsGroup
      testSubj="otlpHttpBuffersGroup"
      title={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpHttpBuffersGroupTitle"
          defaultMessage="Buffers"
        />
      }
    >
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpHttpReadBufferSizeLabel"
            defaultMessage="Read buffer size in bytes (optional)"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="0" />}
        input={inputs.otlpHttpReadBufferSizeInput}
        testSubj="otlpHttpReadBufferSizeInput"
        placeholder="0"
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpHttpWriteBufferSizeLabel"
            defaultMessage="Write buffer size in bytes (optional)"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="524288" />}
        input={inputs.otlpHttpWriteBufferSizeInput}
        testSubj="otlpHttpWriteBufferSizeInput"
        placeholder="524288"
      />
    </OtlpSettingsGroup>
  </EuiAccordion>
);
