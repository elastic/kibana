/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { App as PresentationComponent } from './app';
import {
  getPermission,
  isPermissionsLoading,
  getPermissionsError,
} from './store/reducers/license_management';
import { loadPermissions } from './store/actions/permissions';

const mapStateToProps = state => {
  return {
    hasPermission: getPermission(state),
    permissionsLoading: isPermissionsLoading(state),
    permissionsError: getPermissionsError(state),
  };
};

const mapDispatchToProps = {
  loadPermissions,
};

export const App = withRouter(connect(mapStateToProps, mapDispatchToProps)(PresentationComponent));
