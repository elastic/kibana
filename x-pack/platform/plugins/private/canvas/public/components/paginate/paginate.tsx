/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { InPaginateProps } from '.';

export type PaginateProps = Omit<InPaginateProps, 'startPage'> & {
  pageNumber: number;
  totalPages: number;
  nextPageEnabled: boolean;
  prevPageEnabled: boolean;
  setPage: (num: number) => void;
  nextPage: () => void;
  prevPage: () => void;
};

export type PaginateChildProps = Omit<PaginateProps, 'children'>;

export const Paginate: React.FunctionComponent<PaginateProps> = ({
  children,
  ...childrenProps
}) => {
  return <React.Fragment>{children(childrenProps)}</React.Fragment>;
};
