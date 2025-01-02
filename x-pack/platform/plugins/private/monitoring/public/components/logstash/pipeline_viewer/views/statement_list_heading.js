/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle } from '@elastic/eui';

export function StatementListHeading({ iconType, title }) {
  return (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="baseline">
      <EuiFlexItem grow={false}>
        <EuiIcon type={iconType} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

StatementListHeading.propTypes = {
  iconType: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};
