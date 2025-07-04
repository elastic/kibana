/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import React from 'react';

const LoadingPlaceholdersComponent: React.FC<{
  lines: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  placeholders: number;
}> = ({ lines, placeholders }) => (
  <>
    {[...Array(placeholders).keys()].map((_, i) => (
      <React.Fragment key={i}>
        <EuiSkeletonText lines={lines} data-test-subj={'loadingPlaceholders'} />
        {i !== placeholders - 1 && <EuiSpacer size="l" />}
      </React.Fragment>
    ))}
  </>
);

LoadingPlaceholdersComponent.displayName = 'LoadingPlaceholdersComponent';

export const LoadingPlaceholders = React.memo(LoadingPlaceholdersComponent);
