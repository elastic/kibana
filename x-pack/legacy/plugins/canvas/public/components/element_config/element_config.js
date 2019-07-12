/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiStat, EuiTitle } from '@elastic/eui';
import PropTypes from 'prop-types';
import React, { Fragment } from 'react';

export const ElementConfig = ({ elementStats }) => {
  if (!elementStats) {
    return null;
  }

  const { total, ready, error } = elementStats;
  const progress = total > 0 ? Math.round(((ready + error) / total) * 100) : 100;

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h4>Elements</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat title={total} description="Total" titleSize="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat title={ready} description="Loaded" titleSize="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat title={error} description="Failed" titleSize="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat title={progress + '%'} description="Progress" titleSize="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};

ElementConfig.propTypes = {
  elementStats: PropTypes.object,
};
