/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  donutExample,
  facetExample,
  heatmapExample,
  histogramExample,
  layeredExample,
  searchResponseExample,
  signalExample,
  timeSeriesExample,
  vegaExample,
  vegaExamples,
  vegaGrammarExample,
} from './src/examples';

export { inertLoader } from './src/loader';

export { createVegaPack, vegaInteractiveEnhancement, vegaPack } from './src/pack';

export {
  type VegaNode,
  type VegaPrimitiveOptions,
  MAX_CHART_SIDE,
  MAX_SPEC_CHARS,
  MIN_CHART_SIDE,
  VEGA_INTERACTIVE,
  createVegaPrimitive,
  vegaSchema,
} from './src/primitive';

export {
  type VegaChartInput,
  type VegaLog,
  type VegaMode,
  type VegaSvg,
  createVegaView,
  renderVegaSvg,
  toVegaSpec,
  VegaRenderError,
} from './src/render';

export {
  type SpecIssue,
  type SpecObject,
  MAX_SPEC_DEPTH,
  hardenVegaSpec,
  specIssues,
  stripSpec,
} from './src/spec';

export { type VegaDataset, primaryDataset, vegaDatasets } from './src/summary';

export {
  vegaBorealisAdaptiveTheme,
  vegaBorealisDarkTheme,
  vegaBorealisLightTheme,
} from './src/borealis_theme';

export {
  type VegaTheme,
  vegaAdaptiveTheme,
  vegaConfig,
  vegaDarkTheme,
  vegaLightTheme,
  vegaLiteConfig,
} from './src/theme';

export { type HydratedVega, hydrateVega } from './src/client';
