/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { AggFieldPair, SplitField } from '../../../../../../../../common/types/fields';
import { ChartSettings } from '../../../charts/common/settings';
import { LineChartData } from '../../../../../common/chart_loader';
import { ModelItem, Anomaly } from '../../../../../common/results_loader';
import { JOB_TYPE } from '../../../../../common/job_creator/util/constants';
import { SplitCards, useAnimateSplit } from '../split_cards';
import { DetectorTitle } from '../detector_title';
import { ByFieldSelector } from '../split_field';
import { AnomalyChart, CHART_TYPE } from '../../../charts/anomaly_chart';

type DetectorFieldValues = Record<number, string[]>;

interface ChartGridProps {
  aggFieldPairList: AggFieldPair[];
  chartSettings: ChartSettings;
  splitField: SplitField;
  lineChartsData: LineChartData;
  modelData: Record<number, ModelItem[]>;
  anomalyData: Record<number, Anomaly[]>;
  deleteDetector?: (index: number) => void;
  jobType: JOB_TYPE;
  fieldValuesPerDetector: DetectorFieldValues;
}

export const ChartGrid: FC<ChartGridProps> = ({
  aggFieldPairList,
  chartSettings,
  splitField,
  lineChartsData,
  modelData,
  anomalyData,
  deleteDetector,
  jobType,
  fieldValuesPerDetector,
}) => {
  const animateSplit = useAnimateSplit();

  return (
    <EuiFlexGrid columns={chartSettings.cols}>
      {aggFieldPairList.map((af, i) => (
        <EuiFlexItem key={i}>
          {lineChartsData[i] !== undefined && (
            <Fragment>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <DetectorTitle
                    index={i}
                    agg={aggFieldPairList[i].agg}
                    field={aggFieldPairList[i].field}
                    splitField={splitField}
                    deleteDetector={deleteDetector}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  {deleteDetector !== undefined && <ByFieldSelector detectorIndex={i} />}
                </EuiFlexItem>
              </EuiFlexGroup>
              <SplitCards
                fieldValues={fieldValuesPerDetector[i] || []}
                splitField={splitField}
                numberOfDetectors={aggFieldPairList.length}
                jobType={jobType}
                animate={animateSplit}
              >
                <AnomalyChart
                  chartType={CHART_TYPE.SCATTER}
                  chartData={lineChartsData[i]}
                  modelData={modelData[i]}
                  anomalyData={anomalyData[i]}
                  height={chartSettings.height}
                  width={chartSettings.width}
                />
              </SplitCards>
            </Fragment>
          )}
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};
