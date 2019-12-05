/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { flatten, get } from 'lodash';
import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { InfraMetric, InfraMetricData, InfraNodeType } from '../../../graphql/types';
import { KibanaFramework } from '../framework/kibana_framework_adapter';
import { InfraMetricsAdapter, InfraMetricsRequestOptions } from './adapter_types';
import { checkValidNode } from './lib/check_valid_node';
import { metrics } from '../../../../common/inventory_models';
import { TSVBMetricModelCreator } from '../../../../common/inventory_models/types';
import { calculateMetricInterval } from '../../../utils/calculate_metric_interval';

export class KibanaMetricsAdapter implements InfraMetricsAdapter {
  private framework: KibanaFramework;

  constructor(framework: KibanaFramework) {
    this.framework = framework;
  }

  public async getMetrics(
    requestContext: RequestHandlerContext,
    options: InfraMetricsRequestOptions,
    rawRequest: KibanaRequest // NP_TODO: Temporarily needed until metrics getVisData no longer needs full request
  ): Promise<InfraMetricData[]> {
    const fields = {
      [InfraNodeType.host]: options.sourceConfiguration.fields.host,
      [InfraNodeType.container]: options.sourceConfiguration.fields.container,
      [InfraNodeType.pod]: options.sourceConfiguration.fields.pod,
    };
    const indexPattern = `${options.sourceConfiguration.metricAlias},${options.sourceConfiguration.logAlias}`;
    const nodeField = fields[options.nodeType];
    const search = <Aggregation>(searchOptions: object) =>
      this.framework.callWithRequest<{}, Aggregation>(requestContext, 'search', searchOptions);

    const validNode = await checkValidNode(search, indexPattern, nodeField, options.nodeIds.nodeId);
    if (!validNode) {
      throw new Error(
        i18n.translate('xpack.infra.kibanaMetrics.nodeDoesNotExistErrorMessage', {
          defaultMessage: '{nodeId} does not exist.',
          values: {
            nodeId: options.nodeIds.nodeId,
          },
        })
      );
    }

    const requests = options.metrics.map(metricId =>
      this.makeTSVBRequest(metricId, options, rawRequest, nodeField, requestContext)
    );

    return Promise.all(requests)
      .then(results => {
        return results.map(result => {
          const metricIds = Object.keys(result).filter(
            k => !['type', 'uiRestrictions'].includes(k)
          );

          return metricIds.map((id: string) => {
            const infraMetricId: InfraMetric = (InfraMetric as any)[id];
            if (!infraMetricId) {
              throw new Error(
                i18n.translate('xpack.infra.kibanaMetrics.invalidInfraMetricErrorMessage', {
                  defaultMessage: '{id} is not a valid InfraMetric',
                  values: {
                    id,
                  },
                })
              );
            }
            const panel = result[infraMetricId];
            return {
              id: infraMetricId,
              series: panel.series.map(series => {
                return {
                  id: series.id,
                  label: series.label,
                  data: series.data.map(point => ({ timestamp: point[0], value: point[1] })),
                };
              }),
            };
          });
        });
      })
      .then(result => flatten(result));
  }

  async makeTSVBRequest(
    metricId: InfraMetric,
    options: InfraMetricsRequestOptions,
    req: KibanaRequest,
    nodeField: string,
    requestContext: RequestHandlerContext
  ) {
    const createTSVBModel = get(metrics, ['tsvb', metricId]) as TSVBMetricModelCreator | undefined;
    if (!createTSVBModel) {
      throw new Error(
        i18n.translate('xpack.infra.metrics.missingTSVBModelError', {
          defaultMessage: 'The TSVB model for {metricId} does not exist for {nodeType}',
          values: {
            metricId,
            nodeType: options.nodeType,
          },
        })
      );
    }

    const indexPattern = `${options.sourceConfiguration.metricAlias},${options.sourceConfiguration.logAlias}`;
    const timerange = {
      min: options.timerange.from,
      max: options.timerange.to,
    };

    const model = createTSVBModel(
      options.sourceConfiguration.fields.timestamp,
      indexPattern,
      options.timerange.interval
    );
    const calculatedInterval = await calculateMetricInterval(
      this.framework,
      requestContext,
      {
        indexPattern: `${options.sourceConfiguration.logAlias},${options.sourceConfiguration.metricAlias}`,
        timestampField: options.sourceConfiguration.fields.timestamp,
        timerange: options.timerange,
      },
      model.requires
    );

    if (calculatedInterval) {
      model.interval = `>=${calculatedInterval}s`;
    }

    if (model.id_type === 'cloud' && !options.nodeIds.cloudId) {
      throw new Error(
        i18n.translate('xpack.infra.kibanaMetrics.cloudIdMissingErrorMessage', {
          defaultMessage:
            'Model for {metricId} requires a cloudId, but none was given for {nodeId}.',
          values: {
            metricId,
            nodeId: options.nodeIds.nodeId,
          },
        })
      );
    }
    const id =
      model.id_type === 'cloud' ? (options.nodeIds.cloudId as string) : options.nodeIds.nodeId;
    const filters = model.map_field_to
      ? [{ match: { [model.map_field_to]: id } }]
      : [{ match: { [nodeField]: id } }];

    return this.framework.makeTSVBRequest(req, model, timerange, filters, requestContext);
  }
}
