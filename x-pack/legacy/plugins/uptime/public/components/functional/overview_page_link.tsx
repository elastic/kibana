/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React, { Fragment, FunctionComponent } from 'react';
import { CursorPagination } from '../../../common/graphql/types';
import { useUrlParams } from '../../hooks';

interface OverviewPageLinkProps {
  pagination?: CursorPagination;
}

export const OverviewPageLink: FunctionComponent<OverviewPageLinkProps> = ({
  children,
  pagination,
}) => {
  const [, updateUrlParams] = useUrlParams();
  if (pagination && pagination.cursorKey) {
    const { cursorKey, cursorDirection, sortOrder } = pagination;
    return (
      <EuiLink
        // this needs to be base-64, because it could contain a URL
        onClick={() => updateUrlParams({ cursorKey: btoa(cursorKey), cursorDirection, sortOrder })}
      >
        {children}
      </EuiLink>
    );
  }
  return <Fragment>{children}</Fragment>;
};
