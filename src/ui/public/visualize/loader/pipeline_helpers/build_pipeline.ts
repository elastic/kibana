/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SearchSource } from 'ui/courier';
import { AggConfig, Vis, VisState } from 'ui/vis';

interface Schemas {
  metric: number[];
  [key: string]: number[];
}

type buildVisFunction = (visState: VisState, schemas: Schemas) => string;

interface BuildPipelineVisFunction {
  [key: string]: buildVisFunction;
}

const vislibCharts: string[] = [
  'area',
  'gauge',
  'goal',
  'heatmap',
  'histogram',
  'horizontal_bar',
  'line',
];

export const getSchemas = (vis: Vis): Schemas => {
  let cnt = 0;
  const schemas: Schemas = {
    metric: [],
  };
  const responseAggs = vis.aggs.getResponseAggs();
  const isHierarchical = vis.isHierarchical();
  const metrics = responseAggs.filter((agg: AggConfig) => agg.type.type === 'metrics');
  responseAggs.forEach((agg: AggConfig) => {
    if (!agg.enabled) {
      return;
    }
    let schemaName = agg.schema ? agg.schema.name || agg.schema : null;
    if (typeof schemaName === 'object') {
      schemaName = null;
    }
    if (!schemaName) {
      return;
    }
    if (schemaName === 'split') {
      schemaName = `split_${agg.params.row ? 'row' : 'column'}`;
    }
    if (!schemas[schemaName]) {
      schemas[schemaName] = [];
    }
    if (!isHierarchical || agg.type.type !== 'metrics') {
      schemas[schemaName].push(cnt++);
    }
    if (isHierarchical && agg.type.type !== 'metrics') {
      metrics.forEach(() => {
        schemas.metric.push(cnt++);
      });
    }
  });
  return schemas;
};

export const prepareJson = (variable: string, data: object): string => {
  return `${variable}='${JSON.stringify(data)
    .replace(/\\/g, `\\\\`)
    .replace(/'/g, `\\'`)}' `;
};

export const prepareString = (variable: string, data: string): string => {
  return `${variable}='${data.replace(/\\/g, `\\\\`).replace(/'/g, `\\'`)}' `;
};

export const buildPipelineVisFunction: BuildPipelineVisFunction = {
  vega: visState => {
    return `vega ${prepareString('spec', visState.params.spec)}`;
  },
  input_control_vis: visState => {
    return `input_control_vis ${prepareJson('visConfig', visState.params)}`;
  },
  metrics: visState => {
    return `tsvb ${prepareJson('params', visState.params)}`;
  },
  timelion: visState => {
    const expression = prepareString('expression', visState.params.expression);
    const interval = prepareString('interval', visState.params.interval);
    return `timelion_vis ${expression}${interval}`;
  },
  markdown: visState => {
    const expression = prepareString('expression', visState.params.markdown);
    const visConfig = prepareJson('visConfig', visState.params);
    return `kibana_markdown ${expression}${visConfig}`;
  },
  table: (visState, schemas) => {
    let pipeline = `kibana_table ${prepareJson('visConfig', visState.params)}`;
    if (schemas.split_row) {
      pipeline += `splitRow='${schemas.split_row.join(',')}' `;
    }
    if (schemas.split_column) {
      pipeline += `splitColumn='${schemas.split_column.join(',')}' `;
    }
    if (schemas.bucket) {
      pipeline += `bucket='${schemas.bucket.join(',')}' `;
    }
    pipeline += `metric='${schemas.metric.join(',')}' `;
    return pipeline;
  },
  metric: (visState, schemas) => {
    let pipeline = `kibana_metric ${prepareJson('visConfig', visState.params)}`;
    if (schemas.bucket) {
      pipeline += `bucket='${schemas.bucket.join(',')}' `;
    }
    pipeline += `metric='${schemas.metric.join(',')}' `;
    return pipeline;
  },
  tagcloud: (visState, schemas) => {
    let pipeline = `tagcloud ${prepareJson('visConfig', visState.params)}`;
    pipeline += `bucket='${schemas.segment.join(',')}' `;
    pipeline += `metric='${schemas.metric.join(',')}' `;
    return pipeline;
  },
  region_map: (visState, schemas) => {
    let pipeline = `regionmap ${prepareJson('visConfig', visState.params)}`;
    pipeline += `bucket='${schemas.segment.join(',')}' `;
    pipeline += `metric='${schemas.metric.join(',')}' `;
    return pipeline;
  },
  tile_map: (visState, schemas) => {
    let pipeline = `tilemap ${prepareJson('visConfig', visState.params)}`;
    if (schemas.segment) {
      pipeline += `bucket='${schemas.segment.join(',')}' `;
    }
    pipeline += `metric='${schemas.metric.join(',')}' `;
    return pipeline;
  },
  pie: (visState, schemas) => {
    const visConfig = prepareJson('visConfig', visState.params);
    const visSchemas = prepareJson('schemas', schemas);
    return `kibana_pie ${visConfig}${visSchemas}`;
  },
};

export const buildPipeline = (vis: Vis, params: { searchSource: SearchSource }) => {
  const { searchSource } = params;
  const { indexPattern } = vis;
  const query = searchSource.getField('query');
  const filters = searchSource.getField('filter');
  const visState = vis.getCurrentState();

  // context
  let pipeline = `kibana | kibana_context `;
  if (query) {
    pipeline += prepareJson('query', query);
  }
  if (filters) {
    pipeline += prepareJson('filters', filters);
  }
  if (vis.savedSearchId) {
    pipeline += prepareString('savedSearchId', vis.savedSearchId);
  }
  pipeline += '| ';

  // request handler
  if (vis.type.requestHandler === 'courier') {
    pipeline += `esaggs
    ${prepareString('index', indexPattern.id)}
    metricsAtAllLevels=${vis.isHierarchical()}
    partialRows=${vis.params.showPartialRows || vis.type.requiresPartialRows || false}
    ${prepareJson('aggConfigs', visState.aggs)} | `;
  }

  const schemas = getSchemas(vis);
  if (buildPipelineVisFunction[vis.type.name]) {
    pipeline += buildPipelineVisFunction[vis.type.name](visState, schemas);
  } else if (vislibCharts.includes(vis.type.name)) {
    pipeline += `vislib type='${vis.type.name}'
      ${prepareJson('visConfig', visState.params)}
      ${prepareJson('schemas', schemas)}`;
  } else {
    pipeline += `visualization type='${vis.type.name}'
    ${prepareJson('visConfig', visState.params)}
    metricsAtAllLevels=${vis.isHierarchical()}
    partialRows=${vis.params.showPartialRows || vis.type.name === 'tile_map'} `;
    if (indexPattern) {
      pipeline += `${prepareString('index', indexPattern.id)}`;
    }
  }

  return pipeline;
};
