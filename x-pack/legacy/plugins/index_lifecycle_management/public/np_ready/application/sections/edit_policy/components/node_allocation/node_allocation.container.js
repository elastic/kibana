/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { getNodeOptions } from '../../../../store/selectors';
import { fetchNodes } from '../../../../store/actions';
import { NodeAllocation as PresentationComponent } from './node_allocation';

export const NodeAllocation = connect(
  (state) => ({
    nodeOptions: getNodeOptions(state),
  }),
  {
    fetchNodes,
  }
)(PresentationComponent);
