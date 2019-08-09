/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner
} from '@elastic/eui';
import { LookingFor } from './blurbs';

export function CheckingSettings({ checkMessage }) {
  return (
    <Fragment>
      <LookingFor />
      <EuiHorizontalRule size="half" />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{checkMessage}...</EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
}

CheckingSettings.propTypes = {
  checkMessage: PropTypes.string.isRequired
};
