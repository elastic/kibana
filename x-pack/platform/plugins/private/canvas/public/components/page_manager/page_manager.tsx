/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
// @ts-expect-error untyped local
import * as pageActions from '../../state/actions/pages';
import { canUserWrite } from '../../state/selectors/app';
import { getSelectedPage, getWorkpad, getPages, isWriteable } from '../../state/selectors/workpad';
import { DEFAULT_WORKPAD_CSS } from '../../../common/lib/constants';
import { PageManager as Component } from './page_manager.component';
import type { State } from '../../../types';
import { WorkpadRoutingContext } from '../../routes/workpad';

export const PageManager: FC<{ onPreviousPage: () => void }> = ({ onPreviousPage }) => {
  const dispatch = useDispatch();
  const propsFromState = useSelector((state: State) => ({
    isWriteable: isWriteable(state) && canUserWrite(state),
    pages: getPages(state),
    selectedPage: getSelectedPage(state),
    workpadId: getWorkpad(state).id,
    workpadCSS: getWorkpad(state).css || DEFAULT_WORKPAD_CSS,
  }));

  const { gotoPage } = useContext(WorkpadRoutingContext);

  const onAddPage = useCallback(
    () => dispatch(pageActions.addPage({ gotoPage })),
    [dispatch, gotoPage]
  );

  const onMovePage = useCallback(
    (id: string, position: number) => dispatch(pageActions.movePage(id, position, gotoPage)),
    [dispatch, gotoPage]
  );

  const onRemovePage = useCallback(
    (id: string) => dispatch(pageActions.removePage({ id, gotoPage })),
    [dispatch, gotoPage]
  );

  return (
    <Component
      onPreviousPage={onPreviousPage}
      onAddPage={onAddPage}
      onMovePage={onMovePage}
      onRemovePage={onRemovePage}
      {...propsFromState}
    />
  );
};
