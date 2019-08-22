/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Datasource, Visualization } from '../types';

export interface LensRegistries {
  datasources: Record<string, Datasource>;
  visualizations: Record<string, Visualization>;
  registerDatasource: (name: string, datasource: Datasource) => void;
  registerVisualization: (visualization: Visualization) => void;
}

export function createRegistries(): LensRegistries {
  const datasources: Record<string, Datasource> = {};
  const visualizations: Record<string, Visualization> = {};

  return {
    datasources,
    visualizations,
    registerDatasource(name, datasource) {
      datasources[name] = datasource as Datasource<unknown, unknown>;
    },
    registerVisualization(visualization) {
      visualizations[visualization.id] = visualization as Visualization<unknown, unknown>;
    },
  };
}
