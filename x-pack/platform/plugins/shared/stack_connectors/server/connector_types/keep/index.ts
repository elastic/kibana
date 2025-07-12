/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  SubActionConnectorType,
  ServiceParams,
} from '@kbn/actions-plugin/server/sub_action_framework/types';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import {
  workflowFeature,
  AlertingConnectorFeatureId,
} from '@kbn/actions-plugin/common/connector_feature_config';
import { providers } from '../../../common/keep/providers';
import type { Config, Secrets } from '../../../common/inference/types';

export class KeepConnector extends SubActionConnector<Config, Secrets> {
  protected getResponseErrorMessage(error: { message: string }): string {
    throw new Error(error.message || 'Method not implemented.');
  }

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);
  }
}

export const getConnectorTypes = (): Array<SubActionConnectorType<Config, Secrets>> => {
  return [
    {
      id: 'workflow',
      name: 'Workflow',
      minimumLicenseRequired: 'enterprise' as const,
      supportedFeatureIds: [AlertingConnectorFeatureId],
      getService: (params) => new KeepConnector(params),
      schema: {
        config: schema.any(),
        secrets: schema.any(),
      },
    },
    ...providers.map((provider) => {
      return {
        id: provider.title,
        name: provider.title,
        minimumLicenseRequired: 'enterprise' as const,
        supportedFeatureIds: [workflowFeature.id],
        getService: (params) => new KeepConnector(params),
        schema: {
          config: schema.any(),
          secrets: schema.any(),
        },
      };
    })
  ];
};
