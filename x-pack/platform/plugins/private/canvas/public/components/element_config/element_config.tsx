/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiStat, EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { State } from '../../../types';

const strings = {
  getFailedLabel: () =>
    i18n.translate('xpack.canvas.elementConfig.failedLabel', {
      defaultMessage: 'Failed',
      description:
        'The label for the total number of elements in a workpad that have thrown an error or failed to load',
    }),
  getLoadedLabel: () =>
    i18n.translate('xpack.canvas.elementConfig.loadedLabel', {
      defaultMessage: 'Loaded',
      description: 'The label for the number of elements in a workpad that have loaded',
    }),
  getProgressLabel: () =>
    i18n.translate('xpack.canvas.elementConfig.progressLabel', {
      defaultMessage: 'Progress',
      description: 'The label for the percentage of elements that have finished loading',
    }),
  getTitle: () =>
    i18n.translate('xpack.canvas.elementConfig.title', {
      defaultMessage: 'Element status',
      description:
        '"Elements" refers to the individual text, images, or visualizations that you can add to a Canvas workpad',
    }),
  getTotalLabel: () =>
    i18n.translate('xpack.canvas.elementConfig.totalLabel', {
      defaultMessage: 'Total',
      description: 'The label for the total number of elements in a workpad',
    }),
};

interface Props {
  elementStats: State['transient']['elementStats'];
}

export const ElementConfig = ({ elementStats }: Props) => {
  if (!elementStats) {
    return null;
  }

  const { total, ready, error } = elementStats;
  const progress = total > 0 ? Math.round(((ready + error) / total) * 100) : 100;

  return (
    <div className="canvasSidebar__expandable">
      <EuiAccordion
        id="canvas-element-stats"
        buttonContent={strings.getTitle()}
        initialIsOpen={false}
        className="canvasSidebar__accordion"
      >
        <div className="canvasSidebar__accordionContent">
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem>
              <EuiStat title={total} description={strings.getTotalLabel()} titleSize="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat title={ready} description={strings.getLoadedLabel()} titleSize="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat title={error} description={strings.getFailedLabel()} titleSize="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={progress + '%'}
                description={strings.getProgressLabel()}
                titleSize="xs"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiAccordion>
    </div>
  );
};

ElementConfig.propTypes = {
  elementStats: PropTypes.object,
};
