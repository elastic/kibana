/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamEnrichmentEvents } from '../state_management/stream_enrichment_state_machine';

const conditionUnsupportedMessage = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.createConditionUnsupportedMessage',
  { defaultMessage: 'Conditions are not supported in ingest pipelines yet.' }
);

export const useAddStepActions = () => {
  const {
    core: { notifications },
  } = useKibana();
  const { addProcessor } = useStreamEnrichmentEvents();

  const onAddProcessor = useCallback(
    () => addProcessor(undefined, { parentId: null }),
    [addProcessor]
  );

  const onAddCondition = useCallback(
    () => notifications.toasts.addWarning(conditionUnsupportedMessage),
    [notifications]
  );

  return { onAddCondition, onAddProcessor };
};
