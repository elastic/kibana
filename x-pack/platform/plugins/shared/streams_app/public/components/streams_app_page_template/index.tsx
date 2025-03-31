/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/css';
import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';

export function StreamsAppPageTemplate({ children }: { children: React.ReactNode }) {
  const {
    services: { PageTemplate },
  } = useKibana();

  return (
    <PageTemplate>
      <EuiPanel
        paddingSize="none"
        color="subdued"
        hasShadow={false}
        hasBorder={false}
        className={css`
          display: flex;
          max-width: 100%;
        `}
      >
        {children}
      </EuiPanel>
    </PageTemplate>
  );
}
