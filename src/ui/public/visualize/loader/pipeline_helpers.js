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


import { fromExpression } from '@kbn/interpreter/common/lib/ast';
import { interpretAst } from '@kbn/interpreter/public/interpreter';

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

const vislibCharts = ['histogram', 'line', 'area', 'gauge', 'goal', 'heatmap', 'horizontal_bar'];

export const buildPipeline = (vis, params) => {
  const { searchSource } = params;
  const { indexPattern } = vis;
  const query = searchSource.getField('query');
  const filters = searchSource.getField('filter');
  const visState = vis.getCurrentState();

  let pipeline = `kibana | kibana_context `;
  if (query) {
    pipeline += `q='${JSON.stringify(query).replace(/'/g, `\\'`)}' `;
  }
  if (filters) {
    pipeline += `filters='${JSON.stringify(filters).replace(/'/g, `\\'`)}' `;
  }
  if (vis.savedSearchId) {
    pipeline += `savedSearchId='${vis.savedSearchId}' `;
  }
  pipeline += '| ';
  if (vis.type.requestHandler === 'courier') {
    pipeline += `
    esaggs index='${indexPattern.id}' metricsAtAllLevels=${vis.isHierarchical()} 
    partialRows=${vis.params.showPartialRows || vis.type.name === 'tile_map'}
    aggConfigs='${JSON.stringify(visState.aggs)}' | `;
  }
  if (vis.type.name === 'vega') {
    pipeline += `vega spec='${visState.params.spec.replace(/'/g, `\\'`)}'`;
  } else if (vis.type.name === 'input_control_vis') {
    pipeline += `input_control_vis visConfig='${JSON.stringify(visState.params)}'`;
  } else if (vis.type.name === 'metrics') {
    pipeline += `tsvb params='${JSON.stringify(visState.params)}'`;
  } else if (vis.type.name === 'timelion') {
    pipeline += `timelion_vis expression='${visState.params.expression}' interval='${visState.params.interval}'`;
  } else if (vis.type.name === 'markdown') {
    pipeline += `markdown spec='${visState.params.markdown.replace(/'/g, `\\'`)}' 
    params='${JSON.stringify(visState.params).replace(/'/g, `\\'`)}'`;
  } else if (vis.type.name === 'table') {
    const schemas = getSchemas(vis);
    pipeline += `kibana_table visConfig='${JSON.stringify(visState.params)}' `;
    if (schemas.split) schemas.split.forEach(split => pipeline += `split='${split}' `);
    if (schemas.bucket) schemas.bucket.forEach(bucket => pipeline += `bucket='${bucket}' `);
    schemas.metric.forEach(metric => pipeline += `metric='${metric}' `);
  } else if (vis.type.name === 'metric') {
    const schemas = getSchemas(vis);
    pipeline += `kibana_metric visConfig='${JSON.stringify(visState.params)}' `;
    if (schemas.bucket) schemas.bucket.forEach(bucket => pipeline += `bucket='${bucket}' `);
    schemas.metric.forEach(metric => pipeline += `metric='${metric}' `);
  } else if (vis.type.name === 'tagcloud') {
    const schemas = getSchemas(vis);
    pipeline += `tagcloud visConfig='${JSON.stringify(visState.params)}' `;
    schemas.segment.forEach(bucket => pipeline += `bucket='${bucket}' `);
    schemas.metric.forEach(metric => pipeline += `metric='${metric}' `);
  } else if (vis.type.name === 'region_map') {
    const schemas = getSchemas(vis);
    pipeline += `regionmap visConfig='${JSON.stringify(visState.params)}' `;
    schemas.segment.forEach(bucket => pipeline += `bucket='${bucket}' `);
    schemas.metric.forEach(metric => pipeline += `metric='${metric}' `);
  } else if (vis.type.name === 'pie') {
    pipeline += `kibana_pie visConfig='${JSON.stringify(visState.params)}' schemas='${JSON.stringify(getSchemas(vis))}'`;
  } else if (vis.type.name === 'tile_map') {
    const schemas = getSchemas(vis);
    pipeline += `tilemap visConfig='${JSON.stringify(visState.params)}' `;
    if (schemas.segment) schemas.segment.forEach(bucket => pipeline += `bucket='${bucket}' `);
    schemas.metric.forEach(metric => pipeline += `metric='${metric}' `);
  } else if (vislibCharts.includes(vis.type.name)) {
    pipeline += `vislib type='${vis.type.name}' 
      visConfig='${JSON.stringify(visState.params)}' schemas='${JSON.stringify(getSchemas(vis))}'`;
  } else {
    pipeline += `visualization type='${vis.type.name}' visConfig='${JSON.stringify(visState.params)}'`;
  }

  return pipeline;
};

export const runPipeline = async (pipeline, context, handlers) => {
  try {
    const ast = fromExpression(pipeline);
    const pipelineResponse = await interpretAst(ast, context, handlers);
    return pipelineResponse;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e, pipeline);
  }
};
