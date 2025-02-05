/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queue } from 'async';
import { chunk } from 'lodash';

import { SIGNIFICANT_ITEM_TYPE, type SignificantItem } from '@kbn/ml-agg-utils';
import { i18n } from '@kbn/i18n';

import {
  addSignificantItems,
  updateLoadingState,
} from '@kbn/aiops-log-rate-analysis/api/stream_reducer';

import type {
  AiopsLogRateAnalysisSchema,
  AiopsLogRateAnalysisApiVersion as ApiVersion,
} from '@kbn/aiops-log-rate-analysis/api/schema';
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';
import { fetchTopCategories } from '@kbn/aiops-log-rate-analysis/queries/fetch_top_categories';
import { fetchTopTerms } from '@kbn/aiops-log-rate-analysis/queries/fetch_top_terms';
import type { QueueFieldCandidate } from '@kbn/aiops-log-rate-analysis/queue_field_candidates';
import {
  isKeywordFieldCandidates,
  isTextFieldCandidates,
  QUEUE_CHUNKING_SIZE,
} from '@kbn/aiops-log-rate-analysis/queue_field_candidates';

import {
  LOADED_FIELD_CANDIDATES,
  MAX_CONCURRENT_QUERIES,
  PROGRESS_STEP_P_VALUES,
} from '../response_stream_utils/constants';
import type { ResponseStreamFetchOptions } from '../response_stream_factory';

export const topItemsHandlerFactory =
  <T extends ApiVersion>({
    abortSignal,
    esClient,
    logDebugMessage,
    logger,
    requestBody,
    responseStream,
    stateHandler,
    version,
  }: ResponseStreamFetchOptions<T>) =>
  async ({
    keywordFieldCandidates,
    textFieldCandidates,
  }: {
    keywordFieldCandidates: string[];
    textFieldCandidates: string[];
  }) => {
    // This will store the combined count of detected log patterns and keywords
    let fieldValuePairsCount = 0;

    if (version === '3') {
      const overridesRemainingTextFieldCandidates = (requestBody as AiopsLogRateAnalysisSchema<'3'>)
        .overrides?.remainingTextFieldCandidates;

      if (Array.isArray(overridesRemainingTextFieldCandidates)) {
        textFieldCandidates.push(...overridesRemainingTextFieldCandidates);
      }
    }

    const topCategories: SignificantItem[] = [];

    topCategories.push(
      ...(requestBody.overrides?.significantItems?.filter(
        (d) => d.type === SIGNIFICANT_ITEM_TYPE.LOG_PATTERN
      ) ?? [])
    );

    const topTerms: SignificantItem[] = [];

    topTerms.push(
      ...((requestBody as AiopsLogRateAnalysisSchema<'3'>).overrides?.significantItems?.filter(
        (d) => d.type === SIGNIFICANT_ITEM_TYPE.KEYWORD
      ) ?? [])
    );

    let remainingKeywordFieldCandidates: string[];
    let loadingStepSizeTopTerms = PROGRESS_STEP_P_VALUES;

    if (version === '2') {
      const overridesRemainingFieldCandidates = (requestBody as AiopsLogRateAnalysisSchema<'2'>)
        .overrides?.remainingFieldCandidates;

      if (Array.isArray(overridesRemainingFieldCandidates)) {
        keywordFieldCandidates.push(...overridesRemainingFieldCandidates);
        remainingKeywordFieldCandidates = overridesRemainingFieldCandidates;
        loadingStepSizeTopTerms =
          LOADED_FIELD_CANDIDATES +
          PROGRESS_STEP_P_VALUES -
          (requestBody.overrides?.loaded ?? PROGRESS_STEP_P_VALUES);
      } else {
        remainingKeywordFieldCandidates = keywordFieldCandidates;
      }
    } else if (version === '3') {
      const overridesRemainingKeywordFieldCandidates = (
        requestBody as AiopsLogRateAnalysisSchema<'3'>
      ).overrides?.remainingKeywordFieldCandidates;

      if (Array.isArray(overridesRemainingKeywordFieldCandidates)) {
        keywordFieldCandidates.push(...overridesRemainingKeywordFieldCandidates);
        remainingKeywordFieldCandidates = overridesRemainingKeywordFieldCandidates;
        loadingStepSizeTopTerms =
          LOADED_FIELD_CANDIDATES +
          PROGRESS_STEP_P_VALUES -
          (requestBody.overrides?.loaded ?? PROGRESS_STEP_P_VALUES);
      } else {
        remainingKeywordFieldCandidates = keywordFieldCandidates;
      }
    }

    logDebugMessage('Fetch top items.');

    const topTermsQueueChunks = [
      ...chunk(keywordFieldCandidates, QUEUE_CHUNKING_SIZE).map((d) => ({
        keywordFieldCandidates: d,
      })),
      ...chunk(textFieldCandidates, QUEUE_CHUNKING_SIZE).map((d) => ({ textFieldCandidates: d })),
    ];
    const loadingStepSize = (1 / topTermsQueueChunks.length) * loadingStepSizeTopTerms;

    const topTermsQueue = queue(async function (payload: QueueFieldCandidate) {
      if (isKeywordFieldCandidates(payload)) {
        const { keywordFieldCandidates: fieldNames } = payload;
        let fetchedTopTerms: Awaited<ReturnType<typeof fetchTopTerms>>;

        try {
          fetchedTopTerms = await fetchTopTerms({
            esClient,
            logger,
            emitError: responseStream.pushError,
            abortSignal,
            arguments: {
              ...requestBody,
              fieldNames,
              sampleProbability: stateHandler.sampleProbability(),
            },
          });
        } catch (e) {
          if (!isRequestAbortedError(e)) {
            logger.error(
              `Failed to fetch top items for ${fieldNames.join()}, got: \n${e.toString()}`
            );
            responseStream.pushError(`Failed to fetch top items for ${fieldNames.join()}.`);
          }
          return;
        }

        remainingKeywordFieldCandidates = remainingKeywordFieldCandidates.filter(
          (d) => !fieldNames.includes(d)
        );

        if (fetchedTopTerms.length > 0) {
          topTerms.push(...fetchedTopTerms);
          responseStream.push(addSignificantItems(fetchedTopTerms));
        }

        stateHandler.loaded(loadingStepSize, false);

        responseStream.push(
          updateLoadingState({
            ccsWarning: false,
            loaded: stateHandler.loaded(),
            loadingState: i18n.translate(
              'xpack.aiops.logRateAnalysis.loadingState.identifiedFieldValuePairs',
              {
                defaultMessage:
                  'Identified {fieldValuePairsCount, plural, one {# significant field/value pair} other {# significant field/value pairs}}.',
                values: {
                  fieldValuePairsCount,
                },
              }
            ),
            remainingKeywordFieldCandidates,
          })
        );
      } else if (isTextFieldCandidates(payload)) {
        const { textFieldCandidates: fieldNames } = payload;

        const topCategoriesForField = await fetchTopCategories({
          esClient,
          logger,
          emitError: responseStream.pushError,
          abortSignal,
          arguments: {
            ...requestBody,
            fieldNames,
            sampleProbability: stateHandler.sampleProbability(),
          },
        });

        if (topCategoriesForField.length > 0) {
          topCategories.push(...topCategoriesForField);
          responseStream.push(addSignificantItems(topCategoriesForField));
          fieldValuePairsCount += topCategoriesForField.length;
        }

        stateHandler.loaded(loadingStepSize, false);
      }
    }, MAX_CONCURRENT_QUERIES);

    topTermsQueue.push(topTermsQueueChunks, (err) => {
      if (err) {
        logger.error(`Failed to fetch p-values.', got: \n${err.toString()}`);
        responseStream.pushError(`Failed to fetch p-values.`);
        topTermsQueue.kill();
        responseStream.end();
      } else if (stateHandler.shouldStop()) {
        logDebugMessage('shouldStop fetching p-values.');
        topTermsQueue.kill();
        responseStream.end();
      }
    });
    await topTermsQueue.drain();

    fieldValuePairsCount = topCategories.length + topTerms.length;

    if (fieldValuePairsCount === 0) {
      logDebugMessage('Stopping analysis, did not find any categories or terms.');
      responseStream.endWithUpdatedLoadingState();
      return;
    }

    return {
      fieldValuePairsCount,
      significantCategories: topCategories,
      significantTerms: topTerms,
    };
  };
