/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiCallOut } from '@elastic/eui';

export function SectionUnauthorized({ title, children }) {
  return (
    <Fragment>
      <EuiCallOut title={title} color="warning" iconType="help">
        {children}
      </EuiCallOut>
    </Fragment>
  );
}
