/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, branch, renderComponent } from 'recompose';
import PropTypes from 'prop-types';
import { NoDatasource } from './no_datasource';
import { DatasourceComponent } from './datasource_component';

const branches = [
  // rendered when there is no datasource in the expression
  branch(
    ({ datasource, stateDatasource }) => !datasource || !stateDatasource,
    renderComponent(NoDatasource)
  ),
];

export const Datasource = compose(...branches)(DatasourceComponent);

Datasource.propTypes = {
  args: PropTypes.object,
  datasource: PropTypes.object,
  unknownArgs: PropTypes.array,
};
