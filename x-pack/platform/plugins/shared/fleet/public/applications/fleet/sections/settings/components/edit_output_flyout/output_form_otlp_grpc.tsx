/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { OutputFormInputsType } from './use_output_form';
import { hasOtlpGrpcSettings } from './use_otlp_inputs';
import { OtlpDefaultHint } from './otlp_spec';
import {
  OtlpSettingsGroup,
  OtlpSettingsSpecs,
  OtlpSwitchSetting,
  OtlpTextSetting,
} from './otlp_setting_fields';

const keepaliveDisabledDefault = (
  <FormattedMessage
    id="xpack.fleet.settings.editOutputFlyout.otlpKeepaliveDisabledDefault"
    defaultMessage="not set, keepalive pings are disabled"
  />
);

export const OtlpGrpcSettings: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({
  inputs,
}) => (
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
    <OtlpSettingsSpecs specs={['configGrpc', 'otlpExporter']} />
    <OtlpSettingsGroup
      testSubj="otlpGrpcConnectionGroup"
      title={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpGrpcConnectionGroupTitle"
          defaultMessage="Connection"
        />
      }
    >
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpBalancerNameLabel"
            defaultMessage="Load balancer (optional)"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="round_robin" />}
        input={inputs.otlpBalancerNameInput}
        testSubj="otlpBalancerNameInput"
        placeholder="round_robin"
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpAuthorityLabel"
            defaultMessage="Authority (optional)"
          />
        }
        helpText={
          <OtlpDefaultHint
            defaultText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.otlpAuthorityDefault"
                defaultMessage="the host of the endpoint"
              />
            }
          />
        }
        input={inputs.otlpAuthorityInput}
        testSubj="otlpAuthorityInput"
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpUserAgentLabel"
            defaultMessage="User agent (optional)"
          />
        }
        helpText={
          <OtlpDefaultHint
            defaultText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.otlpUserAgentDefault"
                defaultMessage="the collector name and version"
              />
            }
          />
        }
        input={inputs.otlpUserAgentInput}
        testSubj="otlpUserAgentInput"
      />
      <OtlpSwitchSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpWaitForReadyLabel"
            defaultMessage="Wait for the connection to be ready before sending data"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="false" />}
        input={inputs.otlpWaitForReadyInput}
        testSubj="otlpWaitForReadyInput"
      />
    </OtlpSettingsGroup>
    <OtlpSettingsGroup
      testSubj="otlpGrpcKeepaliveGroup"
      title={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpGrpcKeepaliveGroupTitle"
          defaultMessage="Keepalive"
        />
      }
    >
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpKeepaliveTimeLabel"
            defaultMessage="Keepalive time (optional)"
          />
        }
        helpText={<OtlpDefaultHint defaultText={keepaliveDisabledDefault} />}
        input={inputs.otlpKeepaliveTimeInput}
        testSubj="otlpKeepaliveTimeInput"
        placeholder="10s"
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpKeepaliveTimeoutLabel"
            defaultMessage="Keepalive timeout (optional)"
          />
        }
        helpText={<OtlpDefaultHint defaultText={keepaliveDisabledDefault} />}
        input={inputs.otlpKeepaliveTimeoutInput}
        testSubj="otlpKeepaliveTimeoutInput"
        placeholder="10s"
      />
      <OtlpSwitchSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpKeepalivePermitWithoutStreamLabel"
            defaultMessage="Send keepalive pings without active streams"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="false" />}
        input={inputs.otlpKeepalivePermitWithoutStreamInput}
        testSubj="otlpKeepalivePermitWithoutStreamInput"
      />
    </OtlpSettingsGroup>
    <OtlpSettingsGroup
      testSubj="otlpGrpcBuffersGroup"
      title={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpGrpcBuffersGroupTitle"
          defaultMessage="Buffers"
        />
      }
    >
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpReadBufferSizeLabel"
            defaultMessage="Read buffer size in bytes (optional)"
          />
        }
        helpText={
          <OtlpDefaultHint
            defaultText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.otlpReadBufferSizeDefault"
                defaultMessage="the gRPC library default"
              />
            }
          />
        }
        input={inputs.otlpReadBufferSizeInput}
        testSubj="otlpReadBufferSizeInput"
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpWriteBufferSizeLabel"
            defaultMessage="Write buffer size in bytes (optional)"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="524288" />}
        input={inputs.otlpWriteBufferSizeInput}
        testSubj="otlpWriteBufferSizeInput"
        placeholder="524288"
      />
    </OtlpSettingsGroup>
  </EuiAccordion>
);
