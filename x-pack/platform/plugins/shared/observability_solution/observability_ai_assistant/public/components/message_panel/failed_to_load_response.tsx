/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export function FailedToLoadResponse() {
  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon type="alert" color="danger" size="s" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s" color="danger">
          {i18n.translate('xpack.observabilityAiAssistant.failedLoadingResponseText', {
            defaultMessage: 'Failed to load response',
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
