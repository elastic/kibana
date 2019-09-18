/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React, { Fragment, FunctionComponent } from 'react';
import { useUrlParams } from '../../hooks';

interface OverviewPageLinkProps {
  pagination: string;
}

export const OverviewPageLink: FunctionComponent<OverviewPageLinkProps> = ({
  children,
  pagination,
}) => {
  const [, updateUrlParams] = useUrlParams();
  return (
    <EuiLink
      onClick={() => {
        updateUrlParams({ pagination });
      }}
    >
      {children}
    </EuiLink>
  );
  return <Fragment>{children}</Fragment>;
};
