/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { LicenseDashboard as PresentationComponent } from './license_dashboard';
import { setBreadcrumb } from '../../store/actions/set_breadcrumb';

const mapDispatchToProps = {
  setBreadcrumb,
};

export const LicenseDashboard = connect(null, mapDispatchToProps)(PresentationComponent);
