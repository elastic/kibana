/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import moment from 'moment';
import uuid from 'uuid';

import { NewsItem, RawNewsApiItem, RawNewsApiResponse } from './types';
import { throwIfNotOk } from '../../hooks/api/api';

/**
 * Combines the URL specified with the `newsFeedUrlSetting` with the Kibana
 * version returned from `getKibanaVersion` to form a complete path to the
 * news (specific to the current version of Kibana)
 */
export const getNewsFeedUrl = ({
  newsFeedUrlSetting,
  getKibanaVersion,
}: {
  newsFeedUrlSetting: string;
  getKibanaVersion: () => string;
}) => [newsFeedUrlSetting, `v${getKibanaVersion()}.json`].join('/');

export const NEWS_FEED_FALLBACK_LANGUAGE = 'en';

/**
 * Returns the current locale of the browser as specified in the `document`,
 * or the value of `fallback` if the locale could not be retrieved
 */
export const getLocale = (fallback: string): string =>
  document.documentElement.lang?.toLowerCase() ?? fallback; // use the `lang` attribute of the `html` tag

const NO_NEWS_ITEMS: NewsItem[] = [];

/**
 * Transforms a `RawNewsApiResponse` from the news feed API to a collection of
 * `NewsItem`s
 */
export const getNewsItemsFromApiResponse = (response?: RawNewsApiResponse): NewsItem[] => {
  const locale = getLocale(NEWS_FEED_FALLBACK_LANGUAGE);

  if (response == null || response.items == null) {
    return NO_NEWS_ITEMS;
  }

  return response.items
    .filter((x: RawNewsApiItem | null) => x != null)
    .map<NewsItem>(x => ({
      description:
        get(locale, x.description) ?? get(NEWS_FEED_FALLBACK_LANGUAGE, x.description) ?? '',
      expireOn: new Date(x.expire_on ?? ''),
      hash: x.hash ?? uuid.v4(),
      imageUrl: x.image_url ?? null,
      linkUrl: get(locale, x.link_url) ?? get(NEWS_FEED_FALLBACK_LANGUAGE, x.link_url) ?? '',
      publishOn: new Date(x.publish_on ?? ''),
      title: get(locale, x.title) ?? get(NEWS_FEED_FALLBACK_LANGUAGE, x.title) ?? '',
    }));
};

/**
 * Fetches `RawNewsApiResponse` from the specified `newsFeedUrl`, via a
 * cross-origin (CORS) request. This function throws an error if the request
 * fails
 */
export const fetchNews = async ({
  newsFeedUrl,
}: {
  newsFeedUrl: string;
}): Promise<RawNewsApiResponse> => {
  const response = await fetch(newsFeedUrl, {
    credentials: 'omit',
    method: 'GET',
    mode: 'cors',
  });

  await throwIfNotOk(response);

  return response.json();
};

/**
 * Returns false if `now` is before the `NewsItem` `publishOn` date, or
 * after the `expireOn` date
 */
export const showNewsItem = ({ publishOn, expireOn }: NewsItem): boolean =>
  !moment().isBefore(publishOn) && !moment().isAfter(expireOn);
