/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiLoadingElastic } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useWaitingForAiMessage } from '../../../../hooks/use_waiting_for_ai_message';

export function AiFlowWaitingForGeneration({
  stopGeneration,
  hasInitialResults = false,
}: {
  stopGeneration: () => void;
  hasInitialResults?: boolean;
}) {
  const label = useWaitingForAiMessage(hasInitialResults);

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      justifyContent="center"
      style={{ minHeight: '300px' }}
      gutterSize="m"
    >
      <EuiFlexItem grow={false}>
        <EuiLoadingElastic size="xxl" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{label}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={stopGeneration}>
          {i18n.translate(
            'xpack.streams.aiFlowWaitingForGeneration.button.stopGenerationButtonLabel',
            { defaultMessage: 'Stop' }
          )}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
