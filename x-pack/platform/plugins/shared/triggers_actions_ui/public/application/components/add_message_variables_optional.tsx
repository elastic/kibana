/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ActionVariable } from '@kbn/alerting-plugin/common';
import { AddMessageVariables } from '@kbn/alerts-ui-shared';

interface Props {
  isOptionalField?: boolean;
  messageVariables?: ActionVariable[];
  onSelectEventHandler: (variable: ActionVariable) => void;
  buttonTitle?: string;
  showButtonTitle?: boolean;
  paramsProperty: string;
}

const OPTIONAL_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.labelAppendWithMessageVariables.optionalLabel',
  {
    defaultMessage: 'Optional',
  }
);

export const AddMessageVariablesOptional: React.FunctionComponent<Props> = ({
  buttonTitle,
  messageVariables,
  paramsProperty,
  onSelectEventHandler,
  showButtonTitle = false,
  isOptionalField = false,
}) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexEnd">
      {isOptionalField && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {OPTIONAL_LABEL}
          </EuiText>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <AddMessageVariables
          messageVariables={messageVariables}
          onSelectEventHandler={onSelectEventHandler}
          paramsProperty={paramsProperty}
          buttonTitle={buttonTitle}
          showButtonTitle={showButtonTitle}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
AddMessageVariablesOptional.displayName = 'AddMessageVariablesOptional';
