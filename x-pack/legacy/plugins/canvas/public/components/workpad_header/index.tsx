/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { Dispatch } from 'redux';
// @ts-ignore untyped local
import { canUserWrite } from '../../state/selectors/app';
// @ts-ignore untyped local
import { getSelectedPage, isWriteable } from '../../state/selectors/workpad';
// @ts-ignore untyped local
import { setWriteable } from '../../state/actions/workpad';
import { State } from '../../../types';
import { WorkpadHeader as Component, Props as ComponentProps } from './workpad_header';

interface StateProps {
  isWriteable: boolean;
  canUserWrite: boolean;
  selectedPage: string;
}

interface DispatchProps {
  setWriteable: (isWorkpadWriteable: boolean) => void;
}

const mapStateToProps = (state: State): StateProps => ({
  isWriteable: isWriteable(state) && canUserWrite(state),
  canUserWrite: canUserWrite(state),
  selectedPage: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  setWriteable: (isWorkpadWriteable: boolean) => dispatch(setWriteable(isWorkpadWriteable)),
});

const mergeProps = (
  stateProps: StateProps,
  dispatchProps: DispatchProps,
  ownProps: ComponentProps
): ComponentProps => ({
  ...stateProps,
  ...dispatchProps,
  ...ownProps,
  toggleWriteable: () => dispatchProps.setWriteable(!stateProps.isWriteable),
});

export const WorkpadHeader = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);
