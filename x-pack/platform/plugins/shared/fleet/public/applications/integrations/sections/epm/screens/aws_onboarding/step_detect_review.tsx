/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

// Step 5 (managed-integration path only) — intentionally empty for now.
// The deploy + live detection animation lives entirely on step 4 ("Deploy");
// this step is reserved for whatever review content comes next.
export const StepDetectReview: React.FunctionComponent = () => {
  return (
    <>
      <EuiTitle size="m">
        <h2>Detect &amp; Review</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>[Placeholder — not yet designed.]</p>
      </EuiText>
    </>
  );
};
