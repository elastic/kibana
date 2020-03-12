/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { Dispatch } from 'redux';
import { withKibana } from '../../../../../../../../src/plugins/kibana_react/public/';
import { State, ElementSpec } from '../../../../types';
// @ts-ignore Untyped local
import { elementsRegistry } from '../../../lib/elements_registry';
import { ElementMenu as Component, Props as ComponentProps } from './element_menu';
// @ts-ignore Untyped local
import { addElement } from '../../../state/actions/elements';
import { getSelectedPage } from '../../../state/selectors/workpad';

interface StateProps {
  pageId: string;
}

interface DispatchProps {
  addElement: (pageId: string) => (partialElement: ElementSpec) => void;
}

const mapStateToProps = (state: State) => ({
  pageId: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  addElement: (pageId: string) => (element: ElementSpec) => dispatch(addElement(pageId, element)),
});

const mergeProps = (stateProps: StateProps, dispatchProps: DispatchProps) => ({
  ...stateProps,
  ...dispatchProps,
  addElement: dispatchProps.addElement(stateProps.pageId),
});

export const ElementMenu = compose<ComponentProps, {}>(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withKibana,
  withProps(() => {
    return { elements: elementsRegistry.toJS() };
  })
)(Component);
