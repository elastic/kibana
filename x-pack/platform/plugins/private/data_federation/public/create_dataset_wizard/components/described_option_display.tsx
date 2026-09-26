/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';

export function DescribedOptionDisplay({
  title,
  description,
  testSubj,
}: {
  title: React.ReactNode;
  description: string;
  testSubj?: string;
}) {
  return (
    <div data-test-subj={testSubj}>
      <EuiText size="s">
        <strong>{title}</strong>
      </EuiText>
      <EuiText size="s" color="subdued">
        {description}
      </EuiText>
    </div>
  );
}
