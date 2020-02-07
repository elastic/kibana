/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { RequestTrialExtension as PresentationComponent } from './request_trial_extension';
import { shouldShowRequestTrialExtension } from '../../../store/reducers/license_management';

const mapStateToProps = state => {
  return {
    shouldShowRequestTrialExtension: shouldShowRequestTrialExtension(state),
  };
};

export const RequestTrialExtension = connect(mapStateToProps)(PresentationComponent);
