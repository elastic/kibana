/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum VisualizeESQLUserIntention {
  generateQueryOnly = 'generateQueryOnly',
  executeAndReturnResults = 'executeAndReturnResults',
  visualizeAuto = 'visualizeAuto',
  visualizeXy = 'visualizeXy',
  visualizeBar = 'visualizeBar',
  visualizeLine = 'visualizeLine',
  visualizeArea = 'visualizeArea',
  visualizeTable = 'visualizeTable',
  visualizeDonut = 'visualizeDonut',
  visualizeTreemap = 'visualizeTreemap',
  visualizeHeatmap = 'visualizeHeatmap',
  visualizeTagcloud = 'visualizeTagcloud',
  visualizeWaffle = 'visualizeWaffle',
}

export const VISUALIZE_ESQL_USER_INTENTIONS: VisualizeESQLUserIntention[] = Object.values(
  VisualizeESQLUserIntention
);
