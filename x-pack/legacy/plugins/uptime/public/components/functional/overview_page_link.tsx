/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React, { Fragment, FunctionComponent } from 'react';
import { CursorPagination, CursorDirection } from '../../../common/graphql/types';
import { useUrlParams } from '../../hooks';

interface OverviewPageLinkProps {
  pagination?: CursorPagination;
}

export const OverviewPageLink: FunctionComponent<OverviewPageLinkProps> = ({
  children,
  pagination,
}) => {
  const [getUrlParams, updateUrlParams] = useUrlParams();
  const { overviewPageIndex } = getUrlParams();
  if (pagination && pagination.cursorKey) {
    const { cursorKey, cursorDirection, sortOrder } = pagination;
    const nextIndex =
      cursorDirection === CursorDirection.BEFORE ? overviewPageIndex - 1 : overviewPageIndex + 1;
    return (
      <EuiLink
        // this needs to be base-64, because it could contain a URL
        onClick={() => {
          updateUrlParams({
            cursorKey: btoa(cursorKey),
            cursorDirection,
            sortOrder,
            overviewPageIndex: nextIndex,
          });
        }}
      >
        {children}
      </EuiLink>
    );
  }
  return <Fragment>{children}</Fragment>;
};
