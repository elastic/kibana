/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VegaCatalogId } from '../dialect';
import {
  chartRules as radarChartRules,
  esqlAdditionalInstructions as radarEsqlAdditionalInstructions,
} from './radar';
import {
  chartRules as sankeyChartRules,
  esqlAdditionalInstructions as sankeyEsqlAdditionalInstructions,
} from './sankey';
import {
  chartRules as sunburstChartRules,
  esqlAdditionalInstructions as sunburstEsqlAdditionalInstructions,
} from './sunburst';

/** Resolve per-catalog Raw Vega authoring rules co-located with each example. */
export const catalogChartRules = (catalogId: VegaCatalogId): string => {
  switch (catalogId) {
    case 'sankey':
      return sankeyChartRules;
    case 'radar':
      return radarChartRules;
    case 'sunburst':
      return sunburstChartRules;
    default:
      return '';
  }
};

/** Resolve per-catalog ES|QL shape instructions (empty when catalog is none). */
export const catalogEsqlAdditionalInstructions = (catalogId: VegaCatalogId): string => {
  switch (catalogId) {
    case 'sankey':
      return sankeyEsqlAdditionalInstructions;
    case 'radar':
      return radarEsqlAdditionalInstructions;
    case 'sunburst':
      return sunburstEsqlAdditionalInstructions;
    default:
      return '';
  }
};
