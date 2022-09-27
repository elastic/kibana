/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC, ReactNode, PropsWithChildren } from 'react';
import { EuiTitle, EuiSpacer } from '@elastic/eui';

export interface Props {
  title: ReactNode;
}

export const Section: FC<PropsWithChildren<Props>> = ({ title, children }) => {
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
