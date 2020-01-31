/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has } from 'lodash/fp';
import { INTERNAL_IDENTIFIER } from '../../../../common/constants';
import { AlertsClient } from '../../../../../alerting';
import { findRules } from '../rules/find_rules';

const DEFAULT_PER_PAGE: number = 1000;

export interface TagType {
  id: string;
  tags: string[];
}

export const isTags = (obj: object): obj is TagType => {
  return has('tags', obj);
};

export const convertToTags = (tagObjects: object[]): string[] => {
  const tags = tagObjects.reduce<string[]>((accum, tagObj) => {
    if (isTags(tagObj)) {
      return [...accum, ...tagObj.tags];
    } else {
      return accum;
    }
  }, []);
  return tags;
};

export const convertTagsToSet = (tagObjects: object[]): Set<string> => {
  return new Set(convertToTags(tagObjects));
};

// Note: This is doing an in-memory aggregation of the tags by calling each of the alerting
// records in batches of this const setting and uses the fields to try to get the least
// amount of data per record back. If saved objects at some point supports aggregations
// then this should be replaced with a an aggregation call.
// Ref: https://www.elastic.co/guide/en/kibana/master/saved-objects-api.html
export const readTags = async ({
  alertsClient,
  perPage = DEFAULT_PER_PAGE,
}: {
  alertsClient: AlertsClient;
  perPage?: number;
}): Promise<string[]> => {
  const tags = await readRawTags({ alertsClient, perPage });
  return tags.filter(tag => !tag.startsWith(INTERNAL_IDENTIFIER));
};

export const readRawTags = async ({
  alertsClient,
  perPage = DEFAULT_PER_PAGE,
}: {
  alertsClient: AlertsClient;
  perPage?: number;
}): Promise<string[]> => {
  const firstTags = await findRules({ alertsClient, fields: ['tags'], perPage, page: 1 });
  const firstSet = convertTagsToSet(firstTags.data);
  const totalPages = Math.ceil(firstTags.total / firstTags.perPage);
  if (totalPages <= 1) {
    return Array.from(firstSet);
  } else {
    const returnTags = await Array(totalPages - 1)
      .fill({})
      .map((_, page) => {
        // page index starts at 2 as we already got the first page and we have more pages to go
        return findRules({ alertsClient, fields: ['tags'], perPage, page: page + 2 });
      })
      .reduce<Promise<Set<string>>>(async (accum, nextTagPage) => {
        const tagArray = convertToTags((await nextTagPage).data);
        return new Set([...(await accum), ...tagArray]);
      }, Promise.resolve(firstSet));

    return Array.from(returnTags);
  }
};
