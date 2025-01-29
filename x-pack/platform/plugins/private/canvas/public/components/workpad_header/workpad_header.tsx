/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { Action } from 'redux-actions';
// @ts-expect-error untyped local
import { elementsRegistry } from '../../lib/elements_registry';
import { canUserWrite } from '../../state/selectors/app';
import { getSelectedPage, isWriteable } from '../../state/selectors/workpad';
import { setWriteable } from '../../state/actions/workpad';
// @ts-expect-error untyped local
import { addElement } from '../../state/actions/elements';
import { CommitFn, ElementSpec, State } from '../../../types';
import { WorkpadHeader as Component, Props as ComponentProps } from './workpad_header.component';
import { AddEmbeddablePanel } from '../embeddable_flyout';

interface Props {
  commit: CommitFn;
}

interface StateProps {
  isWriteable: boolean;
  canUserWrite: boolean;
  selectedPage: string;
  pageId: string;
}

interface DispatchProps {
  onSetWriteable: (isWorkpadWriteable: boolean) => Action<boolean>;
  addElement: (pageId: string) => (partialElement: Partial<ElementSpec>) => void;
}

const mapStateToProps = (state: State): StateProps => ({
  isWriteable: isWriteable(state) && canUserWrite(state),
  canUserWrite: canUserWrite(state),
  selectedPage: getSelectedPage(state),
  pageId: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => ({
  onSetWriteable: (isWorkpadWriteable: boolean) => dispatch(setWriteable(isWorkpadWriteable)),
  addElement: (pageId: string) => (element: Partial<ElementSpec>) =>
    dispatch(addElement(pageId, element)),
});

const mergeProps = (
  stateProps: StateProps,
  dispatchProps: DispatchProps,
  ownProps: Props
): ComponentProps => ({
  ...stateProps,
  ...dispatchProps,
  ...ownProps,
  renderEmbedPanel: (onClose: () => void) => <AddEmbeddablePanel onClose={onClose} />,
  addElement: dispatchProps.addElement(stateProps.pageId),
  elements: elementsRegistry.toJS(),
});

export const WorkpadHeader = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);
