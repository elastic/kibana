/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ClassificationEvaluateResponse } from '../../../../common/analytics';

export function getColumnData(
  confusionMatrixData: ClassificationEvaluateResponse['classification']['multiclass_confusion_matrix']['confusion_matrix']
) {
  const colData: any = [];

  confusionMatrixData.forEach((classData: any) => {
    const correctlyPredictedClass = classData.predicted_classes.find(
      (pc: any) => pc.predicted_class === classData.actual_class
    );
    const incorrectlyPredictedClass = classData.predicted_classes.find(
      (pc: any) => pc.predicted_class !== classData.actual_class
    );

    let accuracy = correctlyPredictedClass.count / classData.actual_class_doc_count;
    // round to 2 decimal places without converting to string;
    accuracy = Math.round(accuracy * 100) / 100;

    let error = incorrectlyPredictedClass.count / classData.actual_class_doc_count;
    error = Math.round(error * 100) / 100;

    colData.push({
      [correctlyPredictedClass.predicted_class]: accuracy,
      [incorrectlyPredictedClass.predicted_class]: error,
      actual_class: classData.actual_class,
      predicted_class: correctlyPredictedClass.predicted_class,
      actual_class_doc_count: classData.actual_class_doc_count,
      count: correctlyPredictedClass.count,
      error_count: incorrectlyPredictedClass.count,
      accuracy,
    });
  });

  const columns: any = [
    {
      id: 'actual_class',
      display: <span />,
    },
  ];

  colData.forEach((data: any) => {
    columns.push({ id: data.predicted_class });
  });

  return { columns, columnData: colData };
}
