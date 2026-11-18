/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useContentListItems, useContentListPhase } from '@kbn/content-list-provider';

interface EisModelsResultsSummaryProps {
  catalogTotal: number;
}

export const EisModelsResultsSummary = ({ catalogTotal }: EisModelsResultsSummaryProps) => {
  const phase = useContentListPhase();
  const { totalItems } = useContentListItems();

  if (phase === 'initialLoad') {
    return null;
  }

  return (
    <EuiText size="xs" color="subdued" data-test-subj="eisModelsResultsSummary">
      <FormattedMessage
        id="xpack.searchInferenceEndpoints.eisModelsPage.resultsSummary"
        defaultMessage="Showing {shown} of {total}"
        values={{ shown: totalItems, total: catalogTotal }}
      />
    </EuiText>
  );
};
