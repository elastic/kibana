/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiAccordion, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { OutputFormInputsType } from './use_output_form';
import {
  getOtlpQueueDefaultsOfInputs,
  hasOtlpQueueSettings,
  hasOtlpRetrySettings,
} from './use_otlp_inputs';
import { OtlpDefaultHint } from './otlp_spec';
import {
  OtlpSelectSetting,
  OtlpSettingsGroup,
  OtlpSettingsSpecs,
  OtlpSwitchSetting,
  OtlpTextSetting,
} from './otlp_setting_fields';

const QUEUE_SIZER_OPTIONS = ['requests', 'items', 'bytes'].map((value) => ({
  value,
  text: value,
}));

const BATCH_UNIT_OPTIONS = ['items', 'bytes'].map((value) => ({ value, text: value }));
const BATCH_SAME_AS_QUEUE_OPTION = {
  value: '',
  text: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpBatchSizerSameAsQueue', {
    defaultMessage: 'Same as the queue',
  }),
};
const BATCH_MANAGED_DEFAULT_OPTION = {
  value: '',
  text: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpBatchSizerManagedDefault', {
    defaultMessage: 'Default (bytes)',
  }),
};

const getBatchSizerOptions = (inputs: OutputFormInputsType, isManaged: boolean) => {
  // a unit that is stored can not be unset
  if (inputs.otlpBatchSizerInput.hasStoredValue) {
    return BATCH_UNIT_OPTIONS;
  }
  // the server gives a batch of the managed endpoint that has no unit the bytes
  if (isManaged) {
    return [BATCH_MANAGED_DEFAULT_OPTION, ...BATCH_UNIT_OPTIONS];
  }
  // a batch can not use the requests of the queue
  return inputs.otlpQueueSizerInput.value === 'requests'
    ? BATCH_UNIT_OPTIONS
    : [BATCH_SAME_AS_QUEUE_OPTION, ...BATCH_UNIT_OPTIONS];
};

const OtlpBatchFields: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({ inputs }) => {
  const defaults = getOtlpQueueDefaultsOfInputs(inputs);
  return (
    <>
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpBatchFlushTimeoutLabel"
            defaultMessage="Flush timeout (optional)"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpBatchFlushTimeoutHelpText"
            defaultMessage="Time after which a batch is sent, whatever its size. {defaultHint}"
            values={{ defaultHint: <OtlpDefaultHint defaultValue={defaults.flushTimeout} /> }}
          />
        }
        input={inputs.otlpBatchFlushTimeoutInput}
        testSubj="otlpBatchFlushTimeoutInput"
        placeholder={defaults.flushTimeout}
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpBatchMinSizeLabel"
            defaultMessage="Minimum batch size (optional)"
          />
        }
        helpText={<OtlpDefaultHint defaultValue={`${defaults.minSize}`} />}
        input={inputs.otlpBatchMinSizeInput}
        testSubj="otlpBatchMinSizeInput"
        placeholder={`${defaults.minSize}`}
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpBatchMaxSizeLabel"
            defaultMessage="Maximum batch size (optional)"
          />
        }
        helpText={
          defaults.maxSize ? (
            <OtlpDefaultHint defaultValue={`${defaults.maxSize}`} />
          ) : (
            <OtlpDefaultHint
              defaultText={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.otlpBatchMaxSizeDefault"
                  defaultMessage="0, there is no maximum size"
                />
              }
            />
          )
        }
        input={inputs.otlpBatchMaxSizeInput}
        testSubj="otlpBatchMaxSizeInput"
        placeholder={`${defaults.maxSize}`}
      />
      <OtlpSelectSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpBatchSizerLabel"
            defaultMessage="Batch size unit"
          />
        }
        helpText={
          defaults.isManaged ? (
            <OtlpDefaultHint defaultValue="bytes" />
          ) : (
            <OtlpDefaultHint
              defaultText={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.otlpBatchSizerDefault"
                  defaultMessage="the unit of the queue size, or items if it is not set"
                />
              }
            />
          )
        }
        input={inputs.otlpBatchSizerInput}
        testSubj="otlpBatchSizerInput"
        options={getBatchSizerOptions(inputs, defaults.isManaged)}
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpBatchMetadataKeysLabel"
            defaultMessage="Partition by metadata keys (optional)"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpBatchMetadataKeysHelpText"
            defaultMessage="Client metadata keys, separated by commas, used to batch data separately. Default: none."
          />
        }
        input={inputs.otlpBatchMetadataKeysInput}
        testSubj="otlpBatchMetadataKeysInput"
      />
    </>
  );
};

const OtlpBatchSettings: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({
  inputs,
}) => (
  <OtlpSettingsGroup
    testSubj="otlpBatchGroup"
    title={
      <FormattedMessage
        id="xpack.fleet.settings.editOutputFlyout.otlpBatchGroupTitle"
        defaultMessage="Batching"
      />
    }
  >
    <OtlpSwitchSetting
      label={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpBatchEnabledLabel"
          defaultMessage="Batch data before sending"
        />
      }
      helpText={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpBatchEnabledHelpText"
          defaultMessage="Batching is off by default. With the switch on and the settings below empty, the collector defaults apply."
        />
      }
      input={inputs.otlpBatchEnabledInput}
      testSubj="otlpBatchEnabledInput"
    />
    {inputs.otlpBatchEnabledInput.value && <OtlpBatchFields inputs={inputs} />}
  </OtlpSettingsGroup>
);

export const OtlpSendingQueueSettings: React.FunctionComponent<{
  inputs: OutputFormInputsType;
}> = ({ inputs }) => {
  // collapsed unless the output has queue settings of its own, whatever is edited afterwards
  const [initialIsOpen] = useState(() => hasOtlpQueueSettings(inputs));
  const defaults = getOtlpQueueDefaultsOfInputs(inputs);

  return (
    <EuiAccordion
      id="otlpSendingQueueSettings"
      data-test-subj="settingsOutputsFlyout.otlpSendingQueueSettings"
      initialIsOpen={initialIsOpen}
      paddingSize="m"
      buttonContent={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpSendingQueueSettingsLabel"
          defaultMessage="Sending queue"
        />
      }
    >
      <OtlpSettingsSpecs specs={['exporterHelper']} />
      <OtlpSettingsGroup
        testSubj="otlpQueueGroup"
        title={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpQueueGroupTitle"
            defaultMessage="Queue"
          />
        }
      >
        <OtlpSwitchSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpQueueEnabledLabel"
              defaultMessage="Use a sending queue"
            />
          }
          helpText={<OtlpDefaultHint defaultValue="true" />}
          input={inputs.otlpQueueEnabledInput}
          testSubj="otlpQueueEnabledInput"
        />
        <OtlpTextSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpQueueNumConsumersLabel"
              defaultMessage="Consumers (optional)"
            />
          }
          helpText={<OtlpDefaultHint defaultValue="10" />}
          input={inputs.otlpQueueNumConsumersInput}
          testSubj="otlpQueueNumConsumersInput"
          placeholder="10"
        />
        <OtlpTextSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpQueueSizeLabel"
              defaultMessage="Queue size (optional)"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpQueueSizeHelpText"
              defaultMessage="Maximum size of the queue, in the unit below. {defaultHint}"
              values={{ defaultHint: <OtlpDefaultHint defaultValue={`${defaults.queueSize}`} /> }}
            />
          }
          input={inputs.otlpQueueSizeInput}
          testSubj="otlpQueueSizeInput"
          placeholder={`${defaults.queueSize}`}
        />
        <OtlpSelectSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpQueueSizerLabel"
              defaultMessage="Queue size unit"
            />
          }
          helpText={<OtlpDefaultHint defaultValue={defaults.sizer} />}
          input={inputs.otlpQueueSizerInput}
          testSubj="otlpQueueSizerInput"
          options={QUEUE_SIZER_OPTIONS}
        />
        <OtlpSwitchSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpQueueWaitForResultLabel"
              defaultMessage="Block incoming requests until they are processed"
            />
          }
          helpText={<OtlpDefaultHint defaultValue="false" />}
          input={inputs.otlpQueueWaitForResultInput}
          testSubj="otlpQueueWaitForResultInput"
        />
        <OtlpSwitchSetting
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpQueueBlockOnOverflowLabel"
              defaultMessage="Block when the queue is full"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.otlpQueueBlockOnOverflowHelpText"
              defaultMessage="Otherwise data is rejected when the queue is full. {defaultHint}"
              values={{
                defaultHint: <OtlpDefaultHint defaultValue={`${defaults.blockOnOverflow}`} />,
              }}
            />
          }
          input={inputs.otlpQueueBlockOnOverflowInput}
          testSubj="otlpQueueBlockOnOverflowInput"
        />
      </OtlpSettingsGroup>
      <OtlpBatchSettings inputs={inputs} />
    </EuiAccordion>
  );
};

export const OtlpRetrySettings: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({
  inputs,
}) => {
  const [initialIsOpen] = useState(() => hasOtlpRetrySettings(inputs));

  return (
    <EuiAccordion
      id="otlpRetrySettings"
      data-test-subj="settingsOutputsFlyout.otlpRetrySettings"
      initialIsOpen={initialIsOpen}
      paddingSize="m"
      buttonContent={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpRetrySettingsLabel"
          defaultMessage="Retry"
        />
      }
    >
      <OtlpSettingsSpecs specs={['exporterHelper']} />
      <OtlpSwitchSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpRetryEnabledLabel"
            defaultMessage="Retry when sending fails"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="true" />}
        input={inputs.otlpRetryEnabledInput}
        testSubj="otlpRetryEnabledInput"
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpRetryInitialIntervalLabel"
            defaultMessage="Initial interval (optional)"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="5s" />}
        input={inputs.otlpRetryInitialIntervalInput}
        testSubj="otlpRetryInitialIntervalInput"
        placeholder="5s"
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpRetryRandomizationFactorLabel"
            defaultMessage="Randomization factor (optional)"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="0.5" />}
        input={inputs.otlpRetryRandomizationFactorInput}
        testSubj="otlpRetryRandomizationFactorInput"
        placeholder="0.5"
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpRetryMultiplierLabel"
            defaultMessage="Multiplier (optional)"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="1.5" />}
        input={inputs.otlpRetryMultiplierInput}
        testSubj="otlpRetryMultiplierInput"
        placeholder="1.5"
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpRetryMaxIntervalLabel"
            defaultMessage="Maximum interval (optional)"
          />
        }
        helpText={<OtlpDefaultHint defaultValue="30s" />}
        input={inputs.otlpRetryMaxIntervalInput}
        testSubj="otlpRetryMaxIntervalInput"
        placeholder="30s"
      />
      <OtlpTextSetting
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpRetryMaxElapsedTimeLabel"
            defaultMessage="Maximum elapsed time (optional)"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpRetryMaxElapsedTimeHelpText"
            defaultMessage="Time after which a batch is dropped, 0 to retry forever. {defaultHint}"
            values={{ defaultHint: <OtlpDefaultHint defaultValue="5m" /> }}
          />
        }
        input={inputs.otlpRetryMaxElapsedTimeInput}
        testSubj="otlpRetryMaxElapsedTimeInput"
        placeholder="5m"
      />
      <EuiSpacer size="s" />
    </EuiAccordion>
  );
};
