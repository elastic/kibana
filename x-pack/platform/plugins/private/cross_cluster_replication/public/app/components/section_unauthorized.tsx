/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, type ReactNode } from 'react';

import { EuiCallOut } from '@elastic/eui';

interface Props {
  title: ReactNode;
  children: ReactNode;
}

export function SectionUnauthorized({ title, children }: Props) {
  return (
    <Fragment>
      <EuiCallOut title={title} color="warning" iconType="question">
        {children}
      </EuiCallOut>
    </Fragment>
  );
}
