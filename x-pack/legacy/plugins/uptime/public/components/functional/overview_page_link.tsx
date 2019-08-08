/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import { Link } from 'react-router-dom';
import React, { FunctionComponent } from 'react';
import { CursorPagination } from '../../../common/graphql/types';
import queryString from 'querystring';

interface OverviewPageLinkProps {
  pagination?: CursorPagination;
  location: string | undefined;
  linkParameters: string | undefined;
}

export const OverviewPageLink: FunctionComponent<OverviewPageLinkProps> = ({
  children,
  pagination,
  location,
  linkParameters,
}) => {
  let params = {};

  if (linkParameters) {
    // Replace prefixed ? since we add our own in
    params = Object.assign(params, queryString.parse(linkParameters.replace(/^\?/, '')));
  }

  if (pagination) {
    params = Object.assign(params, pagination);
  }

  const to = `/?${queryString.encode(params)}`;
  return (
    <EuiLink>
      <Link data-test-subj={`overview-page-link`} to={to}>
        {children}
      </Link>
    </EuiLink>
  );
};
