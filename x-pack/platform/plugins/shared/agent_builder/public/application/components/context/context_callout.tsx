/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { storageKeys } from '../../storage_keys';
import { labels } from '../../utils/i18n';

/**
 * The "What is this?" explainer above the Context table.
 *
 * Dismissal is persisted in local storage so it does not reappear on every visit.
 */
export const ContextCallout: React.FC = () => {
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(
    storageKeys.contextCalloutDismissed,
    false
  );

  const handleDismiss = useCallback(() => setIsDismissed(true), [setIsDismissed]);

  if (isDismissed) {
    return null;
  }

  return (
    <KbnInfoCallout
      title={labels.context.calloutTitle}
      text={<p>{labels.context.calloutBody}</p>}
      onDismiss={handleDismiss}
      data-test-subj="agentBuilderContextCallout"
    />
  );
};
