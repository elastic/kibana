/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
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

export const LabelAppendWithMessageVariables: React.FunctionComponent<Props> = ({
  buttonTitle,
  messageVariables,
  paramsProperty,
  onSelectEventHandler,
  showButtonTitle = false,
  isOptionalField = false,
}) => {
  const messageVariablesLength = messageVariables?.length ?? 0;
  if (isOptionalField && messageVariablesLength === 0) {
    return (
      <EuiText size="xs" color="subdued">
        Optional
      </EuiText>
    );
  }
  if (isOptionalField && messageVariablesLength > 0) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            Optional
          </EuiText>
        </EuiFlexItem>
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
  }
  if (!isOptionalField && messageVariablesLength > 0) {
    return (
      <AddMessageVariables
        messageVariables={messageVariables}
        onSelectEventHandler={onSelectEventHandler}
        paramsProperty={paramsProperty}
        buttonTitle={buttonTitle}
        showButtonTitle={showButtonTitle}
      />
    );
  }
  return null;
};
LabelAppendWithMessageVariables.displayName = 'LabelAppendWithMessageVariables';
