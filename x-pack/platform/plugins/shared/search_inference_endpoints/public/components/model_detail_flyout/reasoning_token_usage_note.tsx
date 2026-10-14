/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const ReasoningTokenUsageNote: React.FC = () => (
  <EuiFlexGroup
    alignItems="center"
    gutterSize="s"
    responsive={false}
    data-test-subj="addEndpointReasoningTokenUsageNote"
  >
    <EuiFlexItem grow={false}>
      <EuiIcon type="info" size="s" color="subdued" aria-hidden />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.searchInferenceEndpoints.addEndpointModal.reasoningTokenUsageNote', {
          defaultMessage: 'These settings will affect token usage.',
        })}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
