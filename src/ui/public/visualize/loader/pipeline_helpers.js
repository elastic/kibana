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


import { fromExpression } from '@kbn/interpreter/common';
import { interpretAst } from '@kbn/interpreter/public';

const getSchemas = (vis) => {
  let cnt = 0;
  const schemas = {
    metric: [],
  };
  const responseAggs = vis.aggs.getResponseAggs();
  const isHierarchical = vis.isHierarchical();
  const metrics = responseAggs.filter(agg => agg.type.type === 'metrics');
  responseAggs.forEach((agg) => {
    if (!agg.enabled) return;
    let schemaName = agg.schema ? agg.schema.name || agg.schema : null;
    if (typeof schemaName === 'object') schemaName = null;
    if (!schemaName) return;
    if (!schemas[schemaName]) schemas[schemaName] = [];
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

const prepareJson = (variable, data) => {
  return `${variable}='${JSON.stringify(data).replace(/'/g, `\\'`)}' `;
};

const prepareString = (variable, data) => {
  return `${variable}='${data.replace(/'/g, `\\'`)}' `;
};

const vislibCharts = ['histogram', 'line', 'area', 'gauge', 'goal', 'heatmap', 'horizontal_bar'];

export const buildPipeline = (vis, params) => {
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
    partialRows=${vis.params.showPartialRows || vis.type.name === 'tile_map'}
    ${prepareJson('aggConfigs', visState.aggs)} | `;
  }

  // response handler/visualization
  if (vis.type.name === 'vega') {
    pipeline += `vega ${prepareString('spec', visState.params.spec)}`;
  } else if (vis.type.name === 'input_control_vis') {
    pipeline += `input_control_vis ${prepareJson('visConfig', visState.params)}`;
  } else if (vis.type.name === 'metrics') {
    pipeline += `tsvb ${prepareJson('params', visState.params)}`;
  } else if (vis.type.name === 'timelion') {
    pipeline += `timelion_vis 
      ${prepareString('expression', visState.params.expression)} 
      interval='${visState.params.interval}'`;
  } else if (vis.type.name === 'markdown') {
    pipeline += `markdown 
      ${prepareString('md', visState.params.markdown)} 
      ${prepareJson('visConfig', visState.params)}`;
  } else if (vis.type.name === 'table') {
    const schemas = getSchemas(vis);
    pipeline += `kibana_table ${prepareJson('visConfig', visState.params)} `;
    if (schemas.split) schemas.split.forEach(split => pipeline += `split='${split}' `);
    if (schemas.bucket) schemas.bucket.forEach(bucket => pipeline += `bucket='${bucket}' `);
    schemas.metric.forEach(metric => pipeline += `metric='${metric}' `);
  } else if (vis.type.name === 'metric') {
    const schemas = getSchemas(vis);
    pipeline += `kibana_metric ${prepareJson('visConfig', visState.params)} `;
    if (schemas.bucket) schemas.bucket.forEach(bucket => pipeline += `bucket='${bucket}' `);
    schemas.metric.forEach(metric => pipeline += `metric='${metric}' `);
  } else if (vis.type.name === 'tagcloud') {
    const schemas = getSchemas(vis);
    pipeline += `tagcloud ${prepareJson('visConfig', visState.params)} `;
    schemas.segment.forEach(bucket => pipeline += `bucket='${bucket}' `);
    schemas.metric.forEach(metric => pipeline += `metric='${metric}' `);
  } else if (vis.type.name === 'region_map') {
    const schemas = getSchemas(vis);
    pipeline += `regionmap ${prepareJson('visConfig', visState.params)} `;
    schemas.segment.forEach(bucket => pipeline += `bucket='${bucket}' `);
    schemas.metric.forEach(metric => pipeline += `metric='${metric}' `);
  } else if (vis.type.name === 'pie') {
    pipeline += `kibana_pie 
      ${prepareJson('visConfig', visState.params)} 
      ${prepareJson('schemas', getSchemas(vis))}`;
  } else if (vis.type.name === 'tile_map') {
    const schemas = getSchemas(vis);
    pipeline += `tilemap ${prepareJson('visConfig', visState.params)} `;
    if (schemas.segment) schemas.segment.forEach(bucket => pipeline += `bucket='${bucket}' `);
    schemas.metric.forEach(metric => pipeline += `metric='${metric}' `);
  } else if (vislibCharts.includes(vis.type.name)) {
    pipeline += `vislib type='${vis.type.name}' 
      ${prepareJson('visConfig', visState.params)} 
      ${prepareJson('schemas', getSchemas(vis))}`;
  } else {
    pipeline += `visualization type='${vis.type.name}' ${prepareJson('visConfig', visState.params)}`;
  }

  return pipeline;
};

export const runPipeline = async (pipeline, context, handlers) => {
  const ast = fromExpression(pipeline);
  const pipelineResponse = await interpretAst(ast, context, handlers);
  return pipelineResponse;
};
