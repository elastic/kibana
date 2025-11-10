/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intersection } from 'lodash';
import Boom from '@hapi/boom';
import { nodeBuilder, toElasticsearchQuery } from '@kbn/es-query';
import type { SavedObjectsRawDocSource } from '@kbn/core-saved-objects-server';

import type { ObservableType } from '../../../common/types/domain/observable/v1';
import {
  // OWNER_FIELD,
  CASE_COMMENT_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
} from '../../../common/constants';
import type { CasesSimilarResponse, SimilarCasesSearchRequest } from '../../../common/types/api';
import { SimilarCasesSearchRequestRt, CasesSimilarResponseRt } from '../../../common/types/api';
import { decodeWithExcessOrThrow, decodeOrThrow } from '../../common/runtime_types';

import { createCaseError } from '../../common/error';
import type { CasesClient, CasesClientArgs } from '..';
import { defaultSortField, flattenCaseSavedObject } from '../../common/utils';
// import { Operations } from '../../authorization';
import {
  buildFilter,
  buildAlertsFieldsFilter,
  // buildObservablesFieldsFilter,
  combineFilters,
} from '../utils';
// import { combineFilterWithAuthorizationFilter } from '../../authorization/utils';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { getAvailableObservableTypesMap } from '../observable_types';
import { AttachmentType } from '../../../common/types/domain';

interface Similarity {
  typeKey: string;
  value: string;
}

const getObservableSimilarities = (
  a: CaseSavedObjectTransformed,
  b: CaseSavedObjectTransformed,
  availableObservableTypes: Map<string, ObservableType>
): Similarity[] => {
  const stringify = (observable: { typeKey: string; value: string }) =>
    [observable.typeKey, observable.value].join(',');

  const setA = new Set(a.attributes.observables.map(stringify));
  const setB = new Set(b.attributes.observables.map(stringify));

  const intersectingObservables: string[] = intersection([...setA], [...setB]);

  return intersectingObservables
    .map((item) => {
      const [typeKey, value] = item.split(',');

      return {
        typeKey,
        value,
        typeLabel: availableObservableTypes.get(typeKey)?.label,
      };
    })
    .filter((observable) => availableObservableTypes.has(observable.typeKey));
};

const getAlertSimilarities = (alertIdsA: Set<string>, alertIdsB: Set<string>): string[] => {
  const intersectingAlerts = intersection([...alertIdsA], [...alertIdsB]);

  // Return as array if multiple, or as single string if one
  if (intersectingAlerts.length === 0) {
    return [];
  }
  if (intersectingAlerts.length === 1) {
    return [intersectingAlerts[0]];
  }
  return intersectingAlerts;
};

/**
 * Retrieves cases similar to a given Case
 */
interface CaseIdsByAlertsAggs {
  references: {
    doc_count: number;
    caseIds: {
      buckets: Array<{ key: string }>;
    };
  };
}

interface CaseIdsByObservablesAggs {
  caseIds: {
    buckets: Array<{ key: string }>;
  };
}

export const similar = async (
  caseId: string,
  params: SimilarCasesSearchRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<CasesSimilarResponse> => {
  const {
    services: { caseService, licensingService, attachmentService },
    logger,
    authorization,
    unsecuredSavedObjectsClient,
  } = clientArgs;

  const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

  if (!hasPlatinumLicenseOrGreater) {
    throw Boom.forbidden(
      'In order to use the similar cases feature, you must be subscribed to an Elastic Platinum license'
    );
  }

  try {
    const paramArgs = decodeWithExcessOrThrow(SimilarCasesSearchRequestRt)(params);
    const retrievedCase = await caseService.getCase({ id: caseId });

    const availableObservableTypesMap = await getAvailableObservableTypesMap(
      casesClient,
      retrievedCase.attributes.owner
    );

    // Get alert IDs from the current case
    const currentCaseAlertIds = await attachmentService.getter.getAllAlertIds({ caseId });

    // const ownerFilter = buildFilter({
    //   filters: ['cases.owner'],
    //   field: OWNER_FIELD,
    //   operator: 'or',
    // });

    // const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
    //   await authorization.getAuthorizationFilter(Operations.findCases);

    // // Get case IDs that share observables
    // let caseIdsWithSharedObservables: string[] = [];
    // const observablesMap = retrievedCase.attributes.observables.reduce(
    //   (observableMap, observable) => {
    //     // NOTE: skip non-existent observable types
    //     if (!availableObservableTypesMap.has(observable.typeKey)) {
    //       return observableMap;
    //     }

    //     if (!observableMap[observable.typeKey]) {
    //       observableMap[observable.typeKey] = [];
    //     }

    //     observableMap[observable.typeKey].push(observable.value);

    //     return observableMap;
    //   },
    //   {} as Record<string, string[]>
    // );

    // if (Object.keys(observablesMap).length > 0) {
    //   const observablesFilter = buildObservablesFieldsFilter(observablesMap);
    //   if (observablesFilter) {
    //     // Use search method with aggregations to find case IDs that share observables
    //     const observablesSearchResponse = await unsecuredSavedObjectsClient.search<
    //       SavedObjectsRawDocSource,
    //       CaseIdsByObservablesAggs
    //     >({
    //       type: 'cases',
    //       namespaces: ['*'],
    //       query: {
    //         bool: {
    //           must: [{ match_all: {} }],
    //           filter: [toElasticsearchQuery(observablesFilter)],
    //         },
    //       },
    //       aggs: {
    //         caseIds: {
    //           terms: {
    //             field: '_id',
    //             size: MAX_DOCS_PER_PAGE,
    //           },
    //         },
    //       },
    //       size: 0,
    //     });

    //     caseIdsWithSharedObservables =
    //       observablesSearchResponse.aggregations?.caseIds.buckets
    //         .map((b) => {
    //           // Extract case ID from _id (format: "cases:case-id")
    //           const idMatch = b.key.match(/^cases:(.+)$/);
    //           return idMatch ? idMatch[1] : null;
    //         })
    //         .filter((id): id is string => id !== null) ?? [];
    //   }
    // }

    // Build alerts filter and get case IDs that share alerts
    let caseIdsWithSharedAlerts: string[] = [];
    if (currentCaseAlertIds.size > 0) {
      const alertsFilter = buildAlertsFieldsFilter([...currentCaseAlertIds]);
      if (alertsFilter) {
        const alertsTypeFilter = buildFilter({
          filters: [AttachmentType.alert],
          field: 'type',
          operator: 'or',
          type: CASE_COMMENT_SAVED_OBJECT,
        });

        const combinedAlertsFilter = combineFilters([alertsFilter, alertsTypeFilter]);

        // Use find method with aggregations to find case IDs that share alerts
        // (find supports filter and aggregations, which is what we need)
        const queryParams = {
          type: CASE_COMMENT_SAVED_OBJECT,
          filter: combinedAlertsFilter,
          perPage: 0,
          aggs: {
            references: {
              nested: {
                path: `${CASE_COMMENT_SAVED_OBJECT}.references`,
              },
              aggregations: {
                caseIds: {
                  terms: {
                    field: `${CASE_COMMENT_SAVED_OBJECT}.references.id`,
                    size: MAX_DOCS_PER_PAGE,
                  },
                },
              },
            },
          },
        };

        const alertsFindResponse = await unsecuredSavedObjectsClient.find<
          unknown,
          CaseIdsByAlertsAggs
        >(queryParams);

        caseIdsWithSharedAlerts =
          alertsFindResponse.aggregations?.references.caseIds.buckets.map((b) => b.key) ?? [];
      }
    }

    // Combine case IDs from both observables and alerts, excluding the current case
    const allSimilarCaseIds = [...caseIdsWithSharedAlerts].filter(
      (id, index, self) => id !== caseId && self.indexOf(id) === index
    ); // Remove duplicates and current case

    // Build a single filter for all similar case IDs
    let similarCasesFilter: ReturnType<typeof nodeBuilder.or> | undefined;
    if (allSimilarCaseIds.length > 0) {
      similarCasesFilter = nodeBuilder.or(
        allSimilarCaseIds.map((id) => nodeBuilder.is('_id', `cases:${id}`))
      );
    }

    // NOTE: empty similar cases filter means that we are unable to show similar cases
    // and should not combine it with general filters below.
    if (!similarCasesFilter) {
      return {
        cases: [],
        page: 1,
        per_page: paramArgs.perPage ?? 0,
        total: 0,
      };
    }

    // const filters = combineFilters([similarCasesFilter, ownerFilter]);

    // const finalCasesFilter = combineFilterWithAuthorizationFilter(filters, authorizationFilter);

    // Use search method to find cases (supports searching across saved objects)
    const page = paramArgs.page ?? 1;
    const perPage = paramArgs.perPage ?? 0;

    // Convert filter to Elasticsearch query
    const filterQuery = similarCasesFilter ? toElasticsearchQuery(similarCasesFilter) : undefined;

    // Build query that excludes the current case
    // Following the saved objects search pattern from the documentation
    const query = {
      bool: {
        must: [
          {
            match_all: {},
          },
        ],
        ...(filterQuery ? { filter: [filterQuery] } : {}),
      },
    };

    logger.info(`[Similar Cases] Cases search query: ${JSON.stringify(query, null, 2)}`);

    // Use search method to find cases
    const casesSearchResponse = await unsecuredSavedObjectsClient.search<SavedObjectsRawDocSource>({
      type: 'cases',
      namespaces: ['*'],
      query,
      sort: [{ [`cases.${defaultSortField}`]: { order: 'desc' } }],
      from: (page - 1) * perPage,
      size: perPage,
    });

    logger.info(
      `[Similar Cases] Cases search response: ${JSON.stringify(casesSearchResponse, null, 2)}`
    );

    // Extract case IDs from search response
    const caseIds = casesSearchResponse.hits.hits
      .map((hit) => {
        if (!hit._id) {
          return null;
        }
        // Extract case ID from _id (format: "cases:case-id")
        const idMatch = hit._id.match(/^cases:(.+)$/);
        return idMatch ? idMatch[1] : null;
      })
      .filter((id): id is string => id !== null);

    // Get cases using the case service to ensure proper transformation
    const casesWithDetails =
      caseIds.length > 0 ? await caseService.getCases({ caseIds }) : { saved_objects: [] };

    // Calculate total from search response
    const total =
      typeof casesSearchResponse.hits.total === 'number'
        ? casesSearchResponse.hits.total
        : casesSearchResponse.hits.total?.value ?? 0;

    // ensureSavedObjectsAreAuthorized(
    //   casesWithDetails.saved_objects
    //     .filter((so) => !so.error)
    //     .map((caseSavedObject) => {
    //       const caseSO = caseSavedObject as CaseSavedObjectTransformed;
    //       return {
    //         id: caseSO.id,
    //         owner: caseSO.attributes.owner,
    //       };
    //     })
    // );

    // Get alert IDs for each similar case
    const similarCasesAlertIdsMap = new Map<string, Set<string>>();
    for (const similarCase of casesWithDetails.saved_objects.filter((so) => !so.error)) {
      const alertIds = await attachmentService.getter.getAllAlertIds({ caseId: similarCase.id });
      similarCasesAlertIdsMap.set(similarCase.id, alertIds);
    }

    const res = {
      cases: casesWithDetails.saved_objects
        .filter((so) => !so.error)
        .map((so) => {
          const caseSavedObject = so as CaseSavedObjectTransformed;
          const similarCaseAlertIds =
            similarCasesAlertIdsMap.get(caseSavedObject.id) ?? new Set<string>();

          return {
            ...flattenCaseSavedObject({ savedObject: caseSavedObject }),
            similarities: {
              observables: getObservableSimilarities(
                retrievedCase,
                caseSavedObject,
                availableObservableTypesMap
              ),
              alertIds:
                similarCaseAlertIds.size > 0
                  ? getAlertSimilarities(currentCaseAlertIds, similarCaseAlertIds)
                  : [],
            },
          };
        }),
      page,
      per_page: perPage,
      total,
    };
    logger.info(`[Similar Cases] Similar cases response: ${JSON.stringify(res, null, 2)}`);

    return decodeOrThrow(CasesSimilarResponseRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to find cases: ${JSON.stringify(params)}: ${error}`,
      error,
      logger,
    });
  }
};
