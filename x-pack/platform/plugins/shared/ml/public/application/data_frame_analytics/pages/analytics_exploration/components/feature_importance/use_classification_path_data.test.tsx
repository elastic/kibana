/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildClassificationDecisionPathData,
  buildRegressionDecisionPathData,
} from './use_classification_path_data';
import type { FeatureImportance } from '@kbn/ml-data-frame-analytics-utils';
import { roundToDecimalPlace } from '@kbn/ml-number-utils';

describe('buildClassificationDecisionPathData()', () => {
  test('returns correct prediction probability for binary classification', () => {
    const expectedResults = [
      { className: 'yes', probability: 0.28564605871278403 },
      { className: 'no', probability: 1 - 0.28564605871278403 },
    ];
    const baselinesData = {
      classes: [
        {
          class_name: 'no',
          baseline: 3.228256450715653,
        },
        {
          class_name: 'yes',
          baseline: -3.228256450715653,
        },
      ],
    };
    const featureImportanceData: FeatureImportance[] = [
      {
        feature_name: 'duration',
        classes: [
          { importance: 2.9932577725789455, class_name: 'yes' },
          { importance: -2.9932577725789455, class_name: 'no' },
        ],
      },
      {
        feature_name: 'job',
        classes: [
          { importance: -0.8023759403354496, class_name: 'yes' },
          { importance: 0.8023759403354496, class_name: 'no' },
        ],
      },
      {
        feature_name: 'poutcome',
        classes: [
          { importance: 0.43319318839128396, class_name: 'yes' },
          { importance: -0.43319318839128396, class_name: 'no' },
        ],
      },
      {
        feature_name: 'housing',
        classes: [
          { importance: -0.3124436380550531, class_name: 'yes' },
          { importance: 0.3124436380550531, class_name: 'no' },
        ],
      },
    ];
    const featureNames = featureImportanceData.map((d) => d.feature_name);

    for (const { className, probability } of expectedResults) {
      const result = buildClassificationDecisionPathData({
        baselines: baselinesData.classes,
        featureImportance: featureImportanceData,
        currentClass: className,
      });
      expect(result).toBeDefined();
      expect(result).toHaveLength(featureNames.length);
      expect(featureNames).toContain(result![0][0]);
      expect(result![0]).toHaveLength(3);
      // Top shown result should equal expected probability
      expect(result![0][2]).toEqual(probability);
      // Make sure probability (result[0]) is always less than 1
      expect(result?.every((r) => r[2] <= 1)).toEqual(true);
    }
  });

  test('returns correct prediction probability & accounts for "other" residual probability for binary classification (boolean)', () => {
    const expectedResults = [
      {
        class_score: 0.1940750725280285,
        class_probability: 0.9034630008985833,
        // boolean class name should be converted to string 'True'/'False'
        class_name: false,
      },
      {
        class_score: 0.09653699910141661,
        class_probability: 0.09653699910141661,
        class_name: true,
      },
    ];
    const baselinesData = {
      classes: [
        {
          class_name: false,
          baseline: 2.418789842558993,
        },
        {
          class_name: true,
          baseline: -2.418789842558993,
        },
      ],
    };
    const featureImportanceData: FeatureImportance[] = [
      {
        feature_name: 'DestWeather',
        classes: [
          {
            importance: 0.5555510565764721,
            // string class names 'true'/'false' should be converted to string 'True'/'False'
            class_name: 'false',
          },
          {
            importance: -0.5555510565764721,
            class_name: 'true',
          },
        ],
      },
      {
        feature_name: 'OriginWeather',
        classes: [
          {
            importance: 0.31139248413258486,
            class_name: 'false',
          },
          {
            importance: -0.31139248413258486,
            class_name: 'true',
          },
        ],
      },
      {
        feature_name: 'OriginAirportID',
        classes: [
          {
            importance: 0.2895740692218651,
            class_name: 'false',
          },
          {
            importance: -0.2895740692218651,
            class_name: 'true',
          },
        ],
      },
      {
        feature_name: 'DestAirportID',
        classes: [
          {
            importance: 0.1297619730881764,
            class_name: 'false',
          },
          {
            importance: -0.1297619730881764,
            class_name: 'true',
          },
        ],
      },
      {
        feature_name: 'hour_of_day',
        classes: [
          {
            importance: -0.10596307272294636,
            class_name: 'false',
          },
          {
            importance: 0.10596307272294636,
            class_name: 'true',
          },
        ],
      },
    ];
    const featureNames = featureImportanceData.map((d) => d.feature_name);

    for (const { class_name: className, class_probability: probability } of expectedResults) {
      const result = buildClassificationDecisionPathData({
        baselines: baselinesData.classes,
        featureImportance: featureImportanceData,
        currentClass: className,
        predictedProbability: probability,
      });

      expect(result).toBeDefined();
      // Should add an 'other' field
      expect(result).toHaveLength(featureNames.length + 1);
      expect(featureNames).toContain(result![0][0]);
      expect(result![0]).toHaveLength(3);
      // Top shown result should equal expected probability
      expect(result![0][2]).toEqual(probability);
      // Make sure probability (result[0]) is always less than 1
      expect(result?.every((r) => r[2] <= 1)).toEqual(true);
    }
  });

  test('returns correct prediction probability for multiclass classification', () => {
    const expectedResults = [{ className: 1, probability: 0.3551929251919077 }];
    const baselinesData = {
      classes: [
        {
          class_name: 0,
          baseline: 0.1845274610161167,
        },
        {
          class_name: 1,
          baseline: 0.1331813646384272,
        },
        {
          class_name: 2,
          baseline: 0.1603600353308416,
        },
      ],
    };
    const featureImportanceData: FeatureImportance[] = [
      {
        feature_name: 'AvgTicketPrice',
        classes: [
          { importance: 0.34413545865934353, class_name: 0 },
          { importance: 0.4781222770431657, class_name: 1 },
          { importance: 0.31847802693610877, class_name: 2 },
        ],
      },
      {
        feature_name: 'Cancelled',
        classes: [
          { importance: 0.0002822015809810556, class_name: 0 },
          { importance: -0.0033337017702255597, class_name: 1 },
          { importance: 0.0020744732163668696, class_name: 2 },
        ],
      },
      {
        feature_name: 'DistanceKilometers',
        classes: [
          { importance: 0.028472232240294063, class_name: 0 },
          { importance: 0.04119838646840895, class_name: 1 },
          { importance: 0.0662663363977551, class_name: 2 },
        ],
      },
    ];
    const featureNames = featureImportanceData.map((d) => d.feature_name);

    for (const { className, probability } of expectedResults) {
      const result = buildClassificationDecisionPathData({
        baselines: baselinesData.classes,
        featureImportance: featureImportanceData,
        currentClass: className,
      });
      expect(result).toBeDefined();
      expect(result).toHaveLength(featureNames.length);
      expect(featureNames).toContain(result![0][0]);
      expect(result![0]).toHaveLength(3);
      // Top shown result should equal expected probability
      expect(result![0][2]).toEqual(probability);
      // Make sure probability (result[0]) is always less than 1
      expect(result?.every((r) => r[2] <= 1)).toEqual(true);
    }
  });

  test('returns correct prediction probability for multiclass classification with "other"', () => {
    const expectedResults = [
      {
        class_score: 0.2653792729907741,
        class_probability: 0.995901728296372,
        class_name: 'Iris-setosa',
      },
      {
        class_score: 0.002499393297421585,
        class_probability: 0.002499393297421585,
        class_name: 'Iris-versicolor',
      },
      {
        class_score: 0.0015399995493349922,
        class_probability: 0.0015988784062062893,
        class_name: 'Iris-virginica',
      },
    ];
    const baselinesData = {
      classes: [
        {
          class_name: 'Iris-setosa',
          baseline: -0.25145851617108084,
        },
        {
          class_name: 'Iris-versicolor',
          baseline: 0.46014588263093625,
        },
        {
          class_name: 'Iris-virginica',
          baseline: -0.20868736645984168,
        },
      ],
    };
    const featureImportanceData: FeatureImportance[] = [
      {
        feature_name: 'petal_length',
        classes: [
          {
            importance: 2.4826228835057464,
            class_name: 'Iris-setosa',
          },
          {
            importance: -0.5861671310095675,
            class_name: 'Iris-versicolor',
          },
          {
            importance: -1.8964557524961734,
            class_name: 'Iris-virginica',
          },
        ],
      },
      {
        feature_name: 'petal_width',
        classes: [
          {
            importance: 1.4568820749127243,
            class_name: 'Iris-setosa',
          },
          {
            importance: -0.9431104132306853,
            class_name: 'Iris-versicolor',
          },
          {
            importance: -0.5137716616820365,
            class_name: 'Iris-virginica',
          },
        ],
      },
      {
        feature_name: 'sepal_width',
        classes: [
          {
            importance: 0.3508206289936615,
            class_name: 'Iris-setosa',
          },
          {
            importance: 0.023074695691663594,
            class_name: 'Iris-versicolor',
          },
          {
            importance: -0.3738953246853245,
            class_name: 'Iris-virginica',
          },
        ],
      },
      {
        feature_name: 'sepal_length',
        classes: [
          {
            importance: -0.027900272907686156,
            class_name: 'Iris-setosa',
          },
          {
            importance: 0.13376776004064217,
            class_name: 'Iris-versicolor',
          },
          {
            importance: -0.1058674871329558,
            class_name: 'Iris-virginica',
          },
        ],
      },
    ];
    const featureNames = featureImportanceData.map((d) => d.feature_name);

    for (const {
      class_name: className,
      class_probability: classPredictedProbability,
    } of expectedResults) {
      const result = buildClassificationDecisionPathData({
        baselines: baselinesData.classes,
        featureImportance: featureImportanceData,
        currentClass: className,
        predictedProbability: classPredictedProbability,
      });
      expect(result).toBeDefined();
      // Result accounts for 'other' or residual importance
      expect(result).toHaveLength(featureNames.length + 1);
      expect(featureNames).toContain(result![0][0]);
      expect(result![0]).toHaveLength(3);
      expect(roundToDecimalPlace(result![0][2], 3)).toEqual(
        roundToDecimalPlace(classPredictedProbability, 3)
      );
      // Make sure probability (result[0]) is always less than 1
      expect(result?.every((r) => r[2] <= 1)).toEqual(true);
    }
  });
});
describe('buildRegressionDecisionPathData()', () => {
  test('returns correct decision path', () => {
    const predictedValue = 0.008000000000000005;
    const baseline = 0.01570748450465414;
    const featureImportanceData: FeatureImportance[] = [
      { feature_name: 'g1', importance: -0.01171550599313763 },
      { feature_name: 'tau4', importance: -0.01190799086101345 },
    ];
    const expectedFeatures = [
      ...featureImportanceData.map((d) => d.feature_name),
      'other',
      'baseline',
    ];

    const result = buildRegressionDecisionPathData({
      baseline,
      featureImportance: featureImportanceData,
      predictedValue: 0.008,
    });
    expect(result).toBeDefined();
    expect(result).toHaveLength(expectedFeatures.length);
    expect(result![0]).toHaveLength(3);
    expect(result![0][2]).toEqual(predictedValue);
  });
});
