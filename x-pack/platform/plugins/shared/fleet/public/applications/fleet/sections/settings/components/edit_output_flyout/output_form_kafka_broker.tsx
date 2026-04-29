/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiPanel, EuiSelect, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

import { kafkaAcknowledgeReliabilityLevel } from '../../../../../../../common/constants';

import type { OutputFormInputsType } from './use_output_form';

export const OutputFormKafkaBroker: React.FunctionComponent<{ inputs: OutputFormInputsType }> = (
  props
) => {
  const { inputs } = props;

  const kafkaBrokerTimeoutOptions = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => (i + 1) * 10).map((timeout) => ({
        text: timeout,
        label: `${timeout} seconds`,
      })),
    []
  );

  const getAckReliabilityLabel = (value: number) => {
    switch (value) {
      case kafkaAcknowledgeReliabilityLevel.DoNotWait:
        return 'No response';
      case kafkaAcknowledgeReliabilityLevel.Replica:
        return 'Wait for all replicas to commit';
      default:
      case kafkaAcknowledgeReliabilityLevel.Commit:
        return 'Wait for local commit';
    }
  };

  const kafkaBrokerAckReliabilityOptions = useMemo(
    () =>
      (
        Object.keys(kafkaAcknowledgeReliabilityLevel) as Array<
          keyof typeof kafkaAcknowledgeReliabilityLevel
        >
      ).map((key) => {
        return {
          text: kafkaAcknowledgeReliabilityLevel[key],
          label: getAckReliabilityLabel(kafkaAcknowledgeReliabilityLevel[key]),
        };
      }),
    []
  );

  return (
    <EuiPanel
      borderRadius="m"
      hasShadow={false}
      paddingSize={'m'}
      color={'subdued'}
      data-test-subj="settingsOutputsFlyout.kafkaBrokerSettingsPanel"
    >
      <EuiTitle size="s">
        <h3 id="FleetEditOutputFlyoutKafkaBrokerSettings">
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaBrokerSettingsTitle"
            defaultMessage="Broker settings"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaBrokerTimeoutInputLabel"
            defaultMessage="Broker timeout"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaBrokerTimeoutInputHelpText"
            defaultMessage="Define how long a Kafka server waits for data in the same cluster."
          />
        }
      >
        <EuiSelect
          fullWidth
          data-test-subj="settingsOutputsFlyout.kafkaBrokerTimeoutInput"
          {...inputs.kafkaBrokerTimeoutInput.props}
          options={kafkaBrokerTimeoutOptions}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaBrokerReachabilityTimeoutInputLabel"
            defaultMessage="Broker reachability timeout"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaBrokerReachabilityTimeoutInputHelpText"
            defaultMessage="Define how long an Agent would wait for a response from Kafka broker."
          />
        }
      >
        <EuiSelect
          fullWidth
          data-test-subj="settingsOutputsFlyout.kafkaBrokerReachabilityTimeoutInput"
          {...inputs.kafkaBrokerReachabilityTimeoutInput.props}
          options={kafkaBrokerTimeoutOptions}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaBrokerAckReliabilityInputLabel"
            defaultMessage="ACK Reliability"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaBrokerAckReliabilityInputHelpText"
            defaultMessage="Reliability level required from the broker."
          />
        }
      >
        <EuiSelect
          fullWidth
          data-test-subj="settingsOutputsFlyout.kafkaBrokerAckReliabilityInputLabel"
          {...inputs.kafkaBrokerAckReliabilityInput.props}
          options={kafkaBrokerAckReliabilityOptions}
        />
      </EuiFormRow>
    </EuiPanel>
  );
};
