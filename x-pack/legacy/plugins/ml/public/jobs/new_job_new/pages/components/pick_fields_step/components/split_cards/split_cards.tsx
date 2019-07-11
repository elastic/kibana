/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, memo, Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

import { SplitField } from '../../../../../../../../common/types/fields';
import { JOB_TYPE } from '../../../../../common/job_creator/util/constants';

interface Props {
  fieldValues: string[];
  splitField: SplitField;
  numberOfDetectors: number;
  children: JSX.Element;
  jobType: JOB_TYPE;
}

interface Panel {
  panel: HTMLDivElement;
  marginBottom: number;
}

export const SplitCards: FC<Props> = memo(
  ({ fieldValues, splitField, children, numberOfDetectors, jobType }) => {
    const panels: Panel[] = [];

    function storePanels(panel: HTMLDivElement | null, marginBottom: number) {
      if (panel !== null) {
        panels.push({ panel, marginBottom });
      }
    }

    function getBackPanels() {
      panels.length = 0;

      const fieldValuesCopy = [...fieldValues];
      fieldValuesCopy.shift();

      let margin = 5;
      const sideMargins = fieldValuesCopy.map((f, i) => (margin += 10 - i)).reverse();

      setTimeout(() => {
        panels.forEach(p => (p.panel.style.marginBottom = `${p.marginBottom}px`));
      }, 100);

      const SPACING = 100;
      const SPLIT_HEIGHT_MULTIPLIER = 1.6;
      return fieldValuesCopy.map((fieldName, i) => {
        const diff = (i + 1) * (SPLIT_HEIGHT_MULTIPLIER * (10 / fieldValuesCopy.length));
        const marginBottom = -SPACING + diff;

        const sideMargin = sideMargins[i];

        const style = {
          height: `${SPACING}px`,
          marginBottom: `-${SPACING}px`,
          marginLeft: `${sideMargin}px`,
          marginRight: `${sideMargin}px`,
          transition: 'margin 0.2s',
        };
        return (
          <div key={fieldName} ref={ref => storePanels(ref, marginBottom)} style={style}>
            <EuiPanel paddingSize="m" style={{ paddingTop: '4px' }}>
              <div style={{ fontWeight: 'bold', fontSize: 'small' }}>{fieldName}</div>
            </EuiPanel>
          </div>
        );
      });
    }

    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          {(fieldValues.length === 0 || numberOfDetectors === 0) && <Fragment>{children}</Fragment>}
          {fieldValues.length > 0 && numberOfDetectors > 0 && splitField !== null && (
            <Fragment>
              {jobType === JOB_TYPE.MULTI_METRIC && (
                <Fragment>
                  <div style={{ fontSize: 'small' }}>Data split by {splitField.name}</div>
                  <EuiSpacer size="m" />
                </Fragment>
              )}

              {getBackPanels()}
              <EuiPanel paddingSize="m" style={{ paddingTop: '4px' }}>
                <div style={{ fontWeight: 'bold', fontSize: 'small' }}>{fieldValues[0]}</div>
                <EuiHorizontalRule margin="s" />
                {children}
              </EuiPanel>
            </Fragment>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
