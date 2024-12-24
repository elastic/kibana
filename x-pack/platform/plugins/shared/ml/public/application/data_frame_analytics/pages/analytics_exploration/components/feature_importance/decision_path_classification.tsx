/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiHealth, EuiSpacer, EuiSuperSelect, EuiTitle } from '@elastic/eui';
import d3 from 'd3';
import type {
  FeatureImportance,
  FeatureImportanceBaseline,
  TopClass,
  TopClasses,
} from '@kbn/ml-data-frame-analytics-utils';
import {
  isDecisionPathData,
  useDecisionPathData,
  getStringBasedClassName,
} from './use_classification_path_data';
import { DecisionPathChart } from './decision_path_chart';
import { MissingDecisionPathCallout } from './missing_decision_path_callout';

interface ClassificationDecisionPathProps {
  predictedValue: string | boolean;
  predictedProbability: number | undefined;
  predictionFieldName?: string;
  featureImportance: FeatureImportance[];
  topClasses: TopClasses;
  baseline?: FeatureImportanceBaseline;
}

export const ClassificationDecisionPath: FC<ClassificationDecisionPathProps> = ({
  featureImportance,
  predictedValue,
  topClasses,
  predictionFieldName,
  predictedProbability,
  baseline,
}) => {
  const [currentClass, setCurrentClass] = useState<string>(
    Array.isArray(topClasses) && topClasses.length > 0
      ? getStringBasedClassName(topClasses[0].class_name)
      : ''
  );
  const selectedClass = topClasses.find(
    (t) => getStringBasedClassName(t.class_name) === getStringBasedClassName(currentClass)
  ) as TopClass;
  const predictedProbabilityForCurrentClass = selectedClass
    ? selectedClass.class_probability
    : undefined;

  const { decisionPathData } = useDecisionPathData({
    baseline,
    featureImportance,
    predictedValue: currentClass,
    predictedProbability: predictedProbabilityForCurrentClass,
  });

  const options = useMemo(() => {
    const predictionValueStr = getStringBasedClassName(predictedValue);

    return Array.isArray(topClasses)
      ? topClasses.map((c) => {
          const className = getStringBasedClassName(c.class_name);
          return {
            value: className,
            inputDisplay:
              className === predictionValueStr ? (
                <EuiHealth color="success" style={{ lineHeight: 'inherit' }}>
                  {className}
                </EuiHealth>
              ) : (
                className
              ),
          };
        })
      : undefined;
  }, [topClasses, predictedValue]);

  const domain = useMemo(() => {
    let maxDomain;
    let minDomain;
    // if decisionPathData has calculated cumulative path
    if (decisionPathData && isDecisionPathData(decisionPathData)) {
      const [min, max] = d3.extent(decisionPathData, (d: [string, number, number]) => d[2]);
      const buffer = Math.abs(max - min) * 0.1;
      maxDomain = max + buffer;
      minDomain = min - buffer;
    }
    return { maxDomain, minDomain };
  }, [decisionPathData]);

  if (!decisionPathData) return <MissingDecisionPathCallout />;

  return (
    <>
      <EuiSpacer size={'xs'} />
      <EuiTitle size={'xxxs'}>
        <span>
          {i18n.translate(
            'xpack.ml.dataframe.analytics.explorationResults.classificationDecisionPathClassNameTitle',
            {
              defaultMessage: 'Class name',
            }
          )}
        </span>
      </EuiTitle>
      {options !== undefined && (
        <EuiSuperSelect
          data-test-subj="mlDFADecisionPathClassNameSelect"
          compressed={true}
          options={options}
          valueOfSelected={currentClass}
          onChange={setCurrentClass}
        />
      )}
      <DecisionPathChart
        decisionPathData={decisionPathData}
        predictionFieldName={predictionFieldName}
        minDomain={domain.minDomain}
        maxDomain={domain.maxDomain}
      />
    </>
  );
};
