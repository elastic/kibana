/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { SearchParams, SearchResponse } from 'elasticsearch';
import { i18n } from '@kbn/i18n';
import { CancellationToken, ScrollConfig, Logger } from '../../../../types';

interface Hit {
  _source: any;
  fields?: any;
  highlight?: any;
  inner_hits?: any;
  matched_queries?: string[] | undefined;
  sort?: string[] | undefined;
}

interface ParsedResponse {
  scrollId: string | undefined;
  hits: Hit[] | undefined;
}

async function parseResponse(request: Promise<SearchResponse<any>>): Promise<ParsedResponse> {
  const response = await request;
  if (!response) {
    throw new Error(
      i18n.translate('xpack.reporting.exportTypes.csv.hitIterator.invalidResponse', {
        defaultMessage: 'Invalid Elasticsearch response! {response}',
        values: { response },
      })
    );
  }

  if (!response.hits) {
    throw new Error(
      i18n.translate('xpack.reporting.exportTypes.csv.hitIterator.expectedHitsErrorMessage', {
        defaultMessage: 'Expected {hits} in the following Elasticsearch response: {response}',
        values: { response: JSON.stringify(response), hits: 'hits' },
      })
    );
  }

  return {
    scrollId: response._scroll_id,
    hits: get(response, 'hits.hits', []),
  };
}

export function createHitIterator(logger: Logger) {
  return async function* hitIterator(
    scrollSettings: ScrollConfig,
    callEndpoint: Function,
    searchRequest: SearchParams,
    cancellationToken: CancellationToken
  ): AsyncGenerator<Hit> {
    logger.debug('executing search request');
    function search(index: string | boolean | string[] | undefined, body: object) {
      return parseResponse(
        callEndpoint('search', {
          index,
          body,
          scroll: scrollSettings.duration,
          size: scrollSettings.size,
        })
      );
    }

    function scroll(scrollId: string | undefined) {
      logger.debug('executing scroll request');
      return parseResponse(
        callEndpoint('scroll', {
          scrollId,
          scroll: scrollSettings.duration,
        })
      );
    }

    function clearScroll(scrollId: string | undefined) {
      logger.debug('executing clearScroll request');
      return callEndpoint('clearScroll', {
        scrollId: [scrollId],
      });
    }

    try {
      let { scrollId, hits } = await search(searchRequest.index, searchRequest.body);
      try {
        while (hits && hits.length && !cancellationToken.isCancelled()) {
          for (const hit of hits) {
            yield hit;
          }

          ({ scrollId, hits } = await scroll(scrollId));

          if (cancellationToken.isCancelled()) {
            logger.warning(
              'Any remaining scrolling searches have been cancelled by the cancellation token.'
            );
          }
        }
      } finally {
        await clearScroll(scrollId);
      }
    } catch (err) {
      logger.error(err);
      throw err;
    }
  };
}
