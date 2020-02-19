/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { selectSelectedMonitor } from '../../../state/selectors';
import { AppState } from '../../../state';
import { PageHeaderComponent } from '../../../pages/page_header';

const mapStateToProps = (state: AppState) => ({
  monitorStatus: selectSelectedMonitor(state),
});

export const PageHeader = connect(mapStateToProps, null)(PageHeaderComponent);
