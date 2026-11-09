/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGrid, EuiSkeletonRectangle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

const SKELETON_CARD_COUNT = 3;
const GRID_COLUMNS = 3;

export const AiIndexListSkeleton = () => (
  <EuiFlexGrid columns={GRID_COLUMNS} gutterSize="l">
    {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
      <EuiSkeletonRectangle
        key={`contextAiIndexCardSkeleton-${index}`}
        width="100%"
        height={160}
        borderRadius="m"
        data-test-subj="contextAiIndexCardSkeleton"
      />
    ))}
  </EuiFlexGrid>
);

export const AiIndexListError = ({ error }: { error: Error }) => (
  <EuiEmptyPrompt
    color="danger"
    iconType="error"
    data-test-subj="contextAiIndexCardsError"
    title={
      <h2>
        <FormattedMessage
          id="xpack.contextEngine.landing.errorTitle"
          defaultMessage="Unable to load AI Indexes"
        />
      </h2>
    }
    body={<p>{error.message}</p>}
  />
);
