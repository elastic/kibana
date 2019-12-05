/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { StartTrial as PresentationComponent } from './start_trial';
import { loadTrialStatus, startLicenseTrial } from '../../../store/actions/start_trial';
import { shouldShowStartTrial } from '../../../store/reducers/license_management';

const mapStateToProps = (state) => {
  return {
    shouldShowStartTrial: shouldShowStartTrial(state),
  };
};

const mapDispatchToProps = {
  loadTrialStatus,
  startLicenseTrial
};

export const StartTrial = connect(mapStateToProps, mapDispatchToProps)(PresentationComponent);
