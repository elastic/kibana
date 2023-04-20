/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getNumTopClasses = (
  analysis: AnalysisConfig
): ClassificationAnalysis['classification']['num_top_classes'] => {
  let numTopClasses;
  if (isClassificationAnalysis(analysis) && analysis.classification.num_top_classes !== undefined) {
    numTopClasses = analysis.classification.num_top_classes;
  }
  return numTopClasses;
};
