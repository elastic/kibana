/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { WorkpadPageRouteParams } from '..';
import { getWorkpad } from '../../../state/selectors/workpad';
// @ts-expect-error
import { setPage } from '../../../state/actions/pages';

export const usePageSync = () => {
  const params = useParams<WorkpadPageRouteParams>();
  const workpad = useSelector(getWorkpad);
  const dispatch = useDispatch();

  const pageNumber = parseInt(params.pageNumber, 10);
  let pageIndex = workpad.page;
  if (!isNaN(pageNumber)) {
    pageIndex = pageNumber - 1;
  }

  useEffect(() => {
    if (pageIndex !== workpad.page) {
      dispatch(setPage(pageIndex));
    }
  }, [pageIndex, workpad.page, dispatch]);
};
