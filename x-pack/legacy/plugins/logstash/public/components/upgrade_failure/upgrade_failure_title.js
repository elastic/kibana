/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle } from '@elastic/eui';

export function UpgradeFailureTitle({ titleText }) {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiIcon size="xl" type="alert" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <h2>{titleText}</h2>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

UpgradeFailureTitle.propTypes = {
  titleText: PropTypes.string.isRequired,
};
