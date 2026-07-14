/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiSkeletonRectangle } from '@elastic/eui';
import React from 'react';

const AI_INDEX_CARD_COUNT = 3;

export const AiIndexCards = () => {
  return (
    <EuiFlexGrid columns={3} gutterSize="m">
      {Array.from({ length: AI_INDEX_CARD_COUNT }).map((_, index) => (
        <EuiSkeletonRectangle
          key={index}
          width="100%"
          height={120}
          borderRadius="m"
          data-test-subj="contextAiIndexCard"
        />
      ))}
    </EuiFlexGrid>
  );
};
