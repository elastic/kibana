/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { ConfigEntryView } from '../../../../common/dynamic_config/types';
import { ConnectorConfigurationField } from './connector_configuration_field';

interface ConnectorConfigurationFormItemsProps {
  isLoading: boolean;
  items: ConfigEntryView[];
  setConfigEntry: (key: string, value: string | number | boolean | null) => void;
  direction?: 'column' | 'row' | 'rowReverse' | 'columnReverse' | undefined;
  itemsGrow?: boolean;
}

export const ConnectorConfigurationFormItems: React.FC<ConnectorConfigurationFormItemsProps> = ({
  isLoading,
  items,
  setConfigEntry,
  direction,
}) => {
  return (
    <EuiFlexGroup direction={direction} data-test-subj="connector-configuration-fields">
      {items.map((configEntry) => {
        const { key, isValid, label, sensitive, description, validationErrors, required } =
          configEntry;

        const helpText = description;
        // toggle and sensitive textarea labels go next to the element, not in the row
        const rowLabel = description ? (
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem>
              <p>{label}</p>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <p>{label}</p>
        );

        const optionalLabel = !required ? (
          <EuiText color="subdued" size="xs">
            {i18n.translate('xpack.stackConnectors.components.inference.config.optionalValue', {
              defaultMessage: 'Optional',
            })}
          </EuiText>
        ) : undefined;

        return (
          <EuiFlexItem key={key}>
            <EuiFormRow
              label={rowLabel}
              fullWidth
              helpText={helpText}
              error={validationErrors}
              isInvalid={!isValid}
              labelAppend={optionalLabel}
              data-test-subj={`connector-configuration-formrow-${key}`}
            >
              <ConnectorConfigurationField
                configEntry={configEntry}
                isLoading={isLoading}
                setConfigValue={(value) => {
                  setConfigEntry(key, value);
                }}
              />
            </EuiFormRow>
            {sensitive ? (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut
                  size="s"
                  color="warning"
                  title={`You will need to reenter your ${label} each time you edit the connector`}
                />
              </>
            ) : null}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
