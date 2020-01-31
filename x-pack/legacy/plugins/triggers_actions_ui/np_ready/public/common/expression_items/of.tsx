/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiExpression,
  EuiPopover,
  EuiPopoverTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiComboBox,
  EuiComboBoxOptionProps,
} from '@elastic/eui';

interface OfExpressionProps {
  aggField?: string;
  errors: { [key: string]: string[] };
  onChangeSelectedAggField: (selectedAggType?: string) => void;
  fieldsOptions?: Array<EuiComboBoxOptionProps<any>>;
}

export const OfExpression = ({
  aggField,
  errors,
  onChangeSelectedAggField,
  fieldsOptions,
}: OfExpressionProps) => {
  const [aggFieldPopoverOpen, setAggFieldPopoverOpen] = useState(false);
  const firstFieldOption = {
    text: i18n.translate(
      'xpack.triggersActionsUI.common.expressionItems.of.selectTimeFieldOptionLabel',
      {
        defaultMessage: 'Select a field',
      }
    ),
    value: '',
  };

  return (
    <EuiPopover
      id="aggFieldPopover"
      button={
        <EuiExpression
          description={i18n.translate(
            'xpack.triggersActionsUI.sections.alertAdd.threshold.ofLabel',
            {
              defaultMessage: 'of',
            }
          )}
          value={aggField || firstFieldOption.text}
          isActive={aggFieldPopoverOpen || !aggField}
          onClick={() => {
            setAggFieldPopoverOpen(true);
          }}
          color={aggField ? 'secondary' : 'danger'}
        />
      }
      isOpen={aggFieldPopoverOpen}
      closePopover={() => {
        setAggFieldPopoverOpen(false);
      }}
      anchorPosition="downLeft"
    >
      <div>
        <EuiPopoverTitle>
          {i18n.translate('xpack.triggersActionsUI.sections.alertAdd.threshold.ofButtonLabel', {
            defaultMessage: 'of',
          })}
        </EuiPopoverTitle>
        <EuiFlexGroup>
          <EuiFlexItem grow={false} className="watcherThresholdAlertAggFieldContainer">
            <EuiFormRow
              isInvalid={errors.aggField.length > 0 && aggField !== undefined}
              error={errors.aggField}
            >
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                isInvalid={errors.aggField.length > 0 && aggField !== undefined}
                placeholder={firstFieldOption.text}
                options={fieldsOptions}
                selectedOptions={aggField ? [{ label: aggField }] : []}
                onChange={selectedOptions => {
                  onChangeSelectedAggField(
                    selectedOptions.length === 1 ? selectedOptions[0].label : undefined
                  );
                  setAggFieldPopoverOpen(false);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
