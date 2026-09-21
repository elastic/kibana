/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../hooks/use_kibana';
import {
  useOptionalInteractiveModeSelector,
  useStreamEnrichmentEvents,
} from './state_management/stream_enrichment_state_machine';

const conditionLabel = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.addConditionButtonText',
  { defaultMessage: 'Condition' }
);

const processorLabel = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.addProcessorButtonText',
  { defaultMessage: 'Processor' }
);

const createConditionText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.createConditionButtonText',
  { defaultMessage: 'Create condition' }
);

const createProcessorText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.createProcessorButtonText',
  { defaultMessage: 'Create processor' }
);

const unsupportedConditionMessage = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.createConditionUnsupportedMessage',
  { defaultMessage: 'Conditions are not supported in ingest pipelines yet.' }
);

export const AddStepButtons = () => {
  const {
    core: { notifications },
  } = useKibana();
  const { addProcessor } = useStreamEnrichmentEvents();

  const canAddStep = useOptionalInteractiveModeSelector(
    (state) => state.can({ type: 'step.addProcessor' }) || state.can({ type: 'step.addCondition' }),
    false
  );

  if (!canAddStep) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          color="text"
          iconType="plus"
          aria-label={createConditionText}
          data-test-subj="streamsAppProcessingToolbarAddConditionButton"
          onClick={() => notifications.toasts.addWarning(unsupportedConditionMessage)}
        >
          {conditionLabel}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          color="text"
          iconType="plus"
          aria-label={createProcessorText}
          data-test-subj="streamsAppProcessingToolbarAddProcessorButton"
          onClick={() => addProcessor(undefined, { parentId: null })}
        >
          {processorLabel}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
