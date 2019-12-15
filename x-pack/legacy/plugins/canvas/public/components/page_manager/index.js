/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withState } from 'recompose';
import * as pageActions from '../../state/actions/pages';
import { canUserWrite } from '../../state/selectors/app';
import { getSelectedPage, getWorkpad, getPages, isWriteable } from '../../state/selectors/workpad';
import { DEFAULT_WORKPAD_CSS } from '../../../common/lib/constants';
import { PageManager as Component } from './page_manager';

const mapStateToProps = state => {
  const { id, css } = getWorkpad(state);

  return {
    isWriteable: isWriteable(state) && canUserWrite(state),
    pages: getPages(state),
    selectedPage: getSelectedPage(state),
    workpadId: id,
    workpadCSS: css || DEFAULT_WORKPAD_CSS,
  };
};

const mapDispatchToProps = dispatch => ({
  addPage: () => dispatch(pageActions.addPage()),
  movePage: (id, position) => dispatch(pageActions.movePage(id, position)),
  duplicatePage: id => dispatch(pageActions.duplicatePage(id)),
  removePage: id => dispatch(pageActions.removePage(id)),
});

export const PageManager = compose(
  connect(mapStateToProps, mapDispatchToProps),
  withState('deleteId', 'setDeleteId', null)
)(Component);
