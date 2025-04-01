/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function SimulatedFunctionCallingCallout() {
  return (
    <EuiCallOut color="warning">
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="warning" />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiText size="s">
            {i18n.translate('xpack.aiAssistant.simulatedFunctionCallingCalloutLabel', {
              defaultMessage:
                'Simulated function calling is enabled. You might see degraded performance.',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
