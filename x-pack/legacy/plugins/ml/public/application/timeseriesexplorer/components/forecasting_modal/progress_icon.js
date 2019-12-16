/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Icon representing the progress of a running forecast.
 */

import PropTypes from 'prop-types';

import React from 'react';

import { EuiIcon, EuiLoadingSpinner } from '@elastic/eui';

import { PROGRESS_STATES } from './progress_states';

export function ProgressIcon({ state }) {
  if (state === PROGRESS_STATES.WAITING) {
    return <EuiLoadingSpinner size="m" />;
  } else if (state === PROGRESS_STATES.DONE) {
    return <EuiIcon type="check" size="m" color="primary" />;
  } else if (state === PROGRESS_STATES.ERROR) {
    return <EuiIcon type="cross" size="m" color="danger" />;
  }
}

ProgressIcon.propTypes = {
  state: PropTypes.number,
};
