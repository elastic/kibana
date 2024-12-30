/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';

import { transitionsRegistry } from '../../lib/transitions_registry';
import { getSelectedPageIndex, getPages } from '../../state/selectors/workpad';
import { stylePage, setPageTransition } from '../../state/actions/pages';
import { PageConfig as Component } from './page_config';

const strings = {
  getNoTransitionDropDownOptionLabel: () =>
    i18n.translate('xpack.canvas.pageConfig.transitions.noneDropDownOptionLabel', {
      defaultMessage: 'None',
      description:
        'This is the option the user should choose if they do not want any page transition (i.e. fade in, fade out, etc) to ' +
        'be applied to the current page.',
    }),
};

const mapStateToProps = (state) => {
  const pageIndex = getSelectedPageIndex(state);
  const page = getPages(state)[pageIndex];
  return { page, pageIndex };
};

const mapDispatchToProps = { stylePage, setPageTransition };

const mergeProps = (stateProps, dispatchProps) => {
  return {
    pageIndex: stateProps.pageIndex,
    setBackground: (background) => {
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
    setTransition: (name) => {
      dispatchProps.setPageTransition(stateProps.page.id, { name });
    },
  };
};

export const PageConfig = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);
