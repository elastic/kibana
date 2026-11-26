/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useId } from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';

interface DetailsSectionProps {
  title: string;
  children: ReactNode;
  'data-test-subj'?: string;
}

export const DetailsSection = ({
  title,
  children,
  'data-test-subj': dataTestSubj,
}: DetailsSectionProps) => {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} data-test-subj={dataTestSubj}>
      <EuiTitle size="xs">
        <h2 id={titleId}>{title}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      {children}
    </section>
  );
};
