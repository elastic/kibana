/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { get } from 'lodash';
import { transitionsRegistry } from '../../lib/transitions_registry';
import { getSelectedPageIndex, getPages } from '../../state/selectors/workpad';
import { stylePage, setPageTransition } from '../../state/actions/pages';
import { ComponentStrings } from '../../../i18n';
import { PageConfig as Component } from './page_config';

const { PageConfig: strings } = ComponentStrings;

const mapStateToProps = state => {
  const pageIndex = getSelectedPageIndex(state);
  const page = getPages(state)[pageIndex];
  return { page, pageIndex };
};

const mapDispatchToProps = { stylePage, setPageTransition };

const mergeProps = (stateProps, dispatchProps) => {
  return {
    pageIndex: stateProps.pageIndex,
    setBackground: background => {
      const itsTheNewStyle = { ...stateProps.page.style, background };
      dispatchProps.stylePage(stateProps.page.id, itsTheNewStyle);
    },
    background: get(stateProps, 'page.style.background'),
    transition: transitionsRegistry.get(get(stateProps, 'page.transition.name')),
    transitions: [{ value: '', text: strings.getNoTransitionDropDownOptionLabel() }].concat(
      transitionsRegistry.toArray().map(({ name, displayName }) => ({
        value: name,
        text: displayName,
      }))
    ),
    setTransition: name => {
      dispatchProps.setPageTransition(stateProps.page.id, { name });
    },
  };
};

export const PageConfig = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);
