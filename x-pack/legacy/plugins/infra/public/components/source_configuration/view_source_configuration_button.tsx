/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { Route } from 'react-router-dom';

export enum ViewSourceConfigurationButtonHrefBase {
  infrastructure = 'infrastructure',
  logs = 'logs',
}

interface ViewSourceConfigurationButtonProps {
  'data-test-subj'?: string;
  hrefBase: ViewSourceConfigurationButtonHrefBase;
  children: React.ReactNode;
}

export const ViewSourceConfigurationButton = ({
  'data-test-subj': dataTestSubj,
  hrefBase,
  children,
}: ViewSourceConfigurationButtonProps) => {
  const href = `/${hrefBase}/settings`;

  return (
    <Route
      key={href}
      path={href}
      children={({ match, history }) => (
        <EuiButton data-test-subj={dataTestSubj} color="primary" onClick={() => history.push(href)}>
          {children}
        </EuiButton>
      )}
    />
  );
};
