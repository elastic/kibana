/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiFieldText,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiRadioGroup,
  EuiComboBox,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  kafkaTopicsType,
  KAFKA_DYNAMIC_FIELDS,
  kafkaTopicsOptions,
} from '../../../../../../../common/constants';

import type { OutputFormInputsType } from './use_output_form';

export const OutputFormKafkaTopics: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({
  inputs,
}) => {
  const dynamicOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    const options = KAFKA_DYNAMIC_FIELDS.map((option) => ({
      label: option,
      value: option,
    }));
    return options;
  }, []);

  const renderTopics = () => {
    switch (inputs.kafkaTopicsInput.value) {
      case kafkaTopicsType.Static:
        return (
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaTopicsDefaultTopicLabel"
                defaultMessage="Default topic"
              />
            }
            {...inputs.kafkaStaticTopicInput.formRowProps}
          >
            <EuiFieldText
              data-test-subj="settingsOutputsFlyout.kafkaStaticTopicInput"
              fullWidth
              {...inputs.kafkaStaticTopicInput.props}
            />
          </EuiFormRow>
        );
      case kafkaTopicsType.Dynamic:
        return (
          <EuiFormRow
            fullWidth
            helpText={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.kafkaDynamicTopicHelptext',
              {
                defaultMessage:
                  'Select a topic from the list. If a topic is not available, create a custom one.',
              }
            )}
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaDynamicTopicLabel"
                defaultMessage="Topic from field"
              />
            }
            {...inputs.kafkaDynamicTopicInput.formRowProps}
          >
            <EuiComboBox
              data-test-subj="settingsOutputsFlyout.kafkaDynamicTopicInput"
              fullWidth
              isClearable={true}
              options={dynamicOptions}
              customOptionText="Use custom field (not recommended)"
              singleSelection={{ asPlainText: true }}
              {...inputs.kafkaDynamicTopicInput.props}
            />
          </EuiFormRow>
        );
    }
  };

  return (
    <EuiPanel
      borderRadius="m"
      hasShadow={false}
      paddingSize={'m'}
      color={'subdued'}
      data-test-subj="settingsOutputsFlyout.kafkaTopicsPanel"
    >
      <EuiTitle size="s">
        <h3 id="FleetEditOutputFlyoutKafkaHeaders">
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaTopcisTitle"
            defaultMessage="Topics"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaTopicsDefaultTopicLabel"
            defaultMessage="Default topic"
          />
        }
      >
        <EuiRadioGroup
          style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 30 }}
          data-test-subj={'editOutputFlyout.kafkaTopicsRadioInput'}
          options={kafkaTopicsOptions}
          compressed
          {...inputs.kafkaTopicsInput.props}
        />
      </EuiFormRow>
      {renderTopics()}

      <EuiSpacer size="m" />
    </EuiPanel>
  );
};
