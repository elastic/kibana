/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiSpacer,
} from '@elastic/eui';

interface Props {
  children: React.ReactNode;
}

export const BasicParametersSection = ({ children }: Props) => {
  return (
    <section>
      <EuiSpacer size="l" />
      {children}
    </section>
  );
};
