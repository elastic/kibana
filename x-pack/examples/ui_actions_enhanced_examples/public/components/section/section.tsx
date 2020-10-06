/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiTitle, EuiSpacer } from '@elastic/eui';

export interface Props {
  title: React.ReactNode;
}

export const Section: React.FC<Props> = ({ title, children }) => {
  return (
    <section>
      <EuiTitle size="m">
        <h2>{title}</h2>
      </EuiTitle>
      <EuiSpacer />
      {children}
    </section>
  );
};
