/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type {
  PropertySelectionHandler,
  SelectionOption,
  SelectionDetails,
  SelectionContext,
} from '@kbn/workflows';

interface InferenceEndpoint {
  inference_id: string;
  service: string;
  task_type: string;
}

async function loadCompletionEndpoints(http: HttpStart): Promise<InferenceEndpoint[]> {
  const response = await http.get<{ endpoints: InferenceEndpoint[] }>(
    '/internal/data_sources/inference_endpoints'
  );
  return response.endpoints;
}

export function createInferenceIdSelectionHandler(
  getHttp: () => Promise<HttpStart>
): PropertySelectionHandler<string> {
  return {
    search: async (
      input: string,
      _context: SelectionContext
    ): Promise<SelectionOption<string>[]> => {
      try {
        const http = await getHttp();
        const endpoints = await loadCompletionEndpoints(http);
        return endpoints
          .filter((ep) => input === '' || ep.inference_id.includes(input))
          .map((ep) => ({
            value: ep.inference_id,
            label: ep.inference_id,
            description: i18n.translate(
              'xpack.dataSources.extractStep.inferenceIdSelection.service',
              {
                defaultMessage: 'Service: {service}',
                values: { service: ep.service },
              }
            ),
          }));
      } catch {
        return [];
      }
    },

    resolve: async (
      value: string,
      _context: SelectionContext
    ): Promise<SelectionOption<string> | null> => {
      try {
        const http = await getHttp();
        const endpoints = await loadCompletionEndpoints(http);
        const endpoint = endpoints.find((ep) => ep.inference_id === value);
        if (!endpoint) return null;

        return {
          value: endpoint.inference_id,
          label: endpoint.inference_id,
          description: i18n.translate(
            'xpack.dataSources.extractStep.inferenceIdSelection.service',
            {
              defaultMessage: 'Service: {service}',
              values: { service: endpoint.service },
            }
          ),
        };
      } catch {
        return null;
      }
    },

    getDetails: async (
      input: string,
      _context: SelectionContext,
      option: SelectionOption<string> | null
    ): Promise<SelectionDetails> => {
      if (option) {
        return {
          message: i18n.translate(
            'xpack.dataSources.extractStep.inferenceIdSelection.connected',
            {
              defaultMessage: 'Connected to endpoint ({label})',
              values: { label: option.label },
            }
          ),
        };
      }
      return {
        message: i18n.translate(
          'xpack.dataSources.extractStep.inferenceIdSelection.notFound',
          {
            defaultMessage: 'Inference endpoint "{input}" not found',
            values: { input },
          }
        ),
      };
    },
  };
}
