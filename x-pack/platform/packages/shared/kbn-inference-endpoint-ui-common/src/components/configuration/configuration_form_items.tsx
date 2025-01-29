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

import { ConfigEntryView } from '../../types/types';
import { ConfigurationField } from './configuration_field';
import * as LABELS from '../../translations';

interface ConfigurationFormItemsProps {
  isLoading: boolean;
  items: ConfigEntryView[];
  setConfigEntry: (key: string, value: string | number | boolean | null) => void;
  direction?: 'column' | 'row' | 'rowReverse' | 'columnReverse' | undefined;
  isEdit?: boolean;
}

export const ConfigurationFormItems: React.FC<ConfigurationFormItemsProps> = ({
  isLoading,
  items,
  setConfigEntry,
  direction,
  isEdit,
}) => {
  return (
    <EuiFlexGroup direction={direction} data-test-subj="configuration-fields">
      {items.map((configEntry) => {
        const { key, isValid, label, sensitive, description, validationErrors, required } =
          configEntry;

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
            {LABELS.OPTIONALTEXT}
          </EuiText>
        ) : undefined;

        return (
          <EuiFlexItem key={key}>
            <EuiFormRow
              label={rowLabel}
              fullWidth
              helpText={description}
              error={validationErrors}
              isInvalid={!isValid}
              labelAppend={optionalLabel}
              data-test-subj={`configuration-formrow-${key}`}
            >
              <ConfigurationField
                configEntry={configEntry}
                isLoading={isLoading}
                setConfigValue={(value) => {
                  setConfigEntry(key, value);
                }}
                isEdit={isEdit}
              />
            </EuiFormRow>
            {sensitive ? (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut size="s" color="warning" title={LABELS.RE_ENTER_SECRETS(label)} />
              </>
            ) : null}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
