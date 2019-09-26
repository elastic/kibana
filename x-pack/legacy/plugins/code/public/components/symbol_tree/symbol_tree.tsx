/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { closeSymbolPath, openSymbolPath } from '../../actions';
import { RootState } from '../../reducers';
import { structureSelector } from '../../selectors';
import { CodeSymbolTree } from './code_symbol_tree';

const mapStateToProps = (state: RootState) => ({
  structureTree: structureSelector(state),
  closedPaths: state.symbol.closedPaths,
});

const mapDispatchToProps = {
  openSymbolPath,
  closeSymbolPath,
};

export const SymbolTree = withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(CodeSymbolTree)
);
