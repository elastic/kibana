/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Kibana 9.4 renamed the Lens embeddable from `lens` to `vis` and aggregation-based visualizations from `visualization` to `legacy_vis`.
 *
 * @see https://github.com/elastic/kibana/pull/260040
 */
export const isLensPanelType = (type: string | undefined): boolean =>
  type === 'lens' || type === 'vis';

export const isVisualizationPanelType = (type: string | undefined): boolean =>
  type === 'visualization' || type === 'legacy_vis';
