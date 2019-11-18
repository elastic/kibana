/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiStat, EuiAccordion, EuiText, EuiSpacer } from '@elastic/eui';
import PropTypes from 'prop-types';
import React from 'react';
import { ComponentStrings } from '../../../i18n';

const { ElementConfig: strings } = ComponentStrings;

export const ElementConfig = ({ elementStats }) => {
  if (!elementStats) {
    return null;
  }

  const { total, ready, error } = elementStats;
  const progress = total > 0 ? Math.round(((ready + error) / total) * 100) : 100;

  return (
    <EuiAccordion
      id="canvas-element-stats"
      buttonContent={
        <EuiText size="s" color="subdued">
          {strings.getTitle()}
        </EuiText>
      }
      initialIsOpen={false}
    >
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiStat
            title={total}
            description={strings.getTotalLabel()}
            titleSize="xs"
            textAlign="center"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={ready}
            description={strings.getLoadedLabel()}
            titleSize="xs"
            textAlign="center"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={error}
            description={strings.getFailedLabel()}
            titleSize="xs"
            textAlign="center"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={progress + '%'}
            description={strings.getProgressLabel()}
            titleSize="xs"
            textAlign="center"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
};

ElementConfig.propTypes = {
  elementStats: PropTypes.object,
};
