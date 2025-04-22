/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  API_VERSIONS,
  AttackDiscovery,
  AttackDiscoveryGetResponse,
  replaceNewlineLiterals,
} from '@kbn/elastic-assistant-common';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import * as uuid from 'uuid';

const CAPABILITIES_QUERY_KEY = ['elastic-assistant', 'attack-discoveries'];

export interface UseAttackDiscoveryParams {
  connectorId: string;
  http: HttpSetup;
  toasts?: IToasts;
}
/**
 * Hook for getting an attack discovery for a given alert
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {IToasts} options.toasts - IToasts
 *
 * @returns {useQuery} hook for getting the status of the Knowledge Base
 */
export const useFetchAttackDiscovery = ({
  // TODO use alertId instead of connectorId
  connectorId,
  http,
  toasts,
}: UseAttackDiscoveryParams): UseQueryResult<AttackDiscovery | null, IHttpFetchError> => {
  return useQuery({
    queryKey: CAPABILITIES_QUERY_KEY,
    queryFn: async ({ signal }) => {
      return http.fetch(`/internal/elastic_assistant/attack_discovery/${connectorId}`, {
        method: 'GET',
        version: API_VERSIONS.internal.v1,
        signal,
      });
    },
    retry: false,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    // Deprecated, hoist to `queryCache` w/in `QueryClient. See: https://stackoverflow.com/a/76961109
    onError: (error: IHttpFetchError<ResponseErrorBody>) => {
      if (error.name !== 'AbortError') {
        toasts?.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
          title: i18n.translate('xpack.elasticAssistant.attackDiscovery.statusError', {
            defaultMessage: 'Error fetching attack discoveries',
          }),
        });
      }
    },
    select: (rawResponse: AttackDiscoveryGetResponse) => {
      const parsedResponse = AttackDiscoveryGetResponse.safeParse(rawResponse);
      if (!parsedResponse.success) {
        throw new Error('Failed to parse the attack discovery GET response');
      }
      const attackDiscovery = parsedResponse.data.data?.attackDiscoveries[0] ?? null;

      return attackDiscovery != null
        ? {
            ...attackDiscovery,
            id: attackDiscovery.id ?? uuid.v4(),
            detailsMarkdown: replaceNewlineLiterals(attackDiscovery.detailsMarkdown),
            entitySummaryMarkdown: replaceNewlineLiterals(
              attackDiscovery.entitySummaryMarkdown ?? ''
            ),
            summaryMarkdown: replaceNewlineLiterals(attackDiscovery.summaryMarkdown),
          }
        : null;
    },
  });
};
