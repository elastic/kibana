/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { NodeAttrsDetails as PresentationComponent } from './node_attrs_details';
import { getNodeDetails } from '../../../../store/selectors';
import { fetchNodeDetails } from '../../../../store/actions';

export const NodeAttrsDetails = connect(
  (state, ownProps) => ({
    details: getNodeDetails(state, ownProps.selectedNodeAttrs),
  }),
  { fetchNodeDetails }
)(PresentationComponent);
