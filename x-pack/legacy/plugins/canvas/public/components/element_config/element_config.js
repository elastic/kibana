/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiStat, EuiTitle } from '@elastic/eui';
import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import { ComponentStrings } from '../../../i18n';

const { ElementConfig: strings } = ComponentStrings;

export const ElementConfig = ({ elementStats }) => {
  if (!elementStats) {
    return null;
  }

  const { total, ready, error } = elementStats;
  const progress = total > 0 ? Math.round(((ready + error) / total) * 100) : 100;

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h4>{strings.getTitle()}</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat title={total} description={strings.getTotalLabel()} titleSize="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat title={ready} description={strings.getLoadedLabel()} titleSize="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat title={error} description={strings.getFailedLabel()} titleSize="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat title={progress + '%'} description={strings.getProgressLabel()} titleSize="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};

ElementConfig.propTypes = {
  elementStats: PropTypes.object,
};
