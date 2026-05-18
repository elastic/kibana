/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';

export function NameAndScopeStep() {
  return (
    <EuiEmptyPrompt
      data-test-subj="onboardingStep-name-and-scope"
      title={<h2>Name &amp; Scope</h2>}
      body={<p>Name &amp; Scope step content will go here.</p>}
    />
  );
}
