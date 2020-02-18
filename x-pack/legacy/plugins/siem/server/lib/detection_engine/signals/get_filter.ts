/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import { AlertServices } from '../../../../../alerting/server/types';
import { assertUnreachable } from '../../../utils/build_query';
import {
  Filter,
  Query,
  esQuery,
  esFilters,
  IIndexPattern,
} from '../../../../../../../../src/plugins/data/server';
import { PartialFilter, RuleAlertParams } from '../types';

// File is from the location of:
// https://cinsscore.com/list/ci-badguys.txt
// and is just an example of how to interpolate and use large volumes of ip ranges as a list
const badFolksIp = fs.readFileSync(`${__dirname}/ip-list.txt`, 'utf8');
const badFolksIpAsArray = badFolksIp.split('\n').filter(item => item.trim() !== '');
console.log('A TON of ips loaded into memory really hacky:', badFolksIp);
console.log('---');
console.log(badFolksIp);
console.log(JSON.stringify(badFolksIpAsArray, null, 2));
console.log('---');

export const getQueryFilter = (
  query: string,
  language: string,
  filters: PartialFilter[],
  index: string[]
) => {
  const indexPattern = {
    fields: [],
    title: index.join(),
  } as IIndexPattern;

  const queries: Query[] = [{ query, language }];
  const config = {
    allowLeadingWildcards: true,
    queryStringOptions: { analyze_wildcard: true },
    ignoreFilterIfFieldNotInIndex: false,
    dateFormatTZ: 'Zulu',
  };

  const enabledFilters = ((filters as unknown) as Filter[]).filter(
    f => f && !esFilters.isFilterDisabled(f)
  );

  const builtQuery = esQuery.buildEsQuery(indexPattern, queries, enabledFilters, config);
  console.log('--- BEFORE CHANGING ---');
  console.log(JSON.stringify(builtQuery, null, 2));
  const filterChanged = builtQuery.bool.filter.map(item => {
    console.log('item is:', item);
    if (item.bool.should != null) {
      const newShould = [];
      item.bool.should.map(childObj => {
        console.log('found child of:', childObj);
        if (childObj.match_phrase != null) {
          const entries = Object.entries(childObj.match_phrase);
          entries.forEach(([key, value]) => {
            if (value.startsWith('$') && value.endsWith('$')) {
              console.log('found a variable of:', value);
              badFolksIpAsArray.forEach(arrayElement => {
                newShould.push({
                  bool: {
                    should: [
                      {
                        match_phrase: {
                          [key]: arrayElement,
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                });
              });
            }
          });
          console.log('found key/value pair of:', entries);
        }
        item.bool.should = newShould;
      });
    }
    return item;
  });
  // let's just find any filters with cash money $variable$ and use lists
  console.log('--- AFTER CHANGING ---');
  console.log(JSON.stringify(builtQuery, null, 2));
  console.log('---');
  // let's just find any filters with cash money $variable$ and use lists

  return builtQuery;
};

interface GetFilterArgs {
  type: RuleAlertParams['type'];
  filters: PartialFilter[] | undefined | null;
  language: string | undefined | null;
  query: string | undefined | null;
  savedId: string | undefined | null;
  services: AlertServices;
  index: string[] | undefined | null;
}

export const getFilter = async ({
  filters,
  index,
  language,
  savedId,
  services,
  type,
  query,
}: GetFilterArgs): Promise<unknown> => {
  switch (type) {
    case 'query': {
      if (query != null && language != null && index != null) {
        return getQueryFilter(query, language, filters || [], index);
      } else {
        throw new TypeError('query, filters, and index parameter should be defined');
      }
    }
    case 'saved_query': {
      if (savedId != null && index != null) {
        try {
          // try to get the saved object first
          const savedObject = await services.savedObjectsClient.get('query', savedId);
          return getQueryFilter(
            savedObject.attributes.query.query,
            savedObject.attributes.query.language,
            savedObject.attributes.filters,
            index
          );
        } catch (err) {
          // saved object does not exist, so try and fall back if the user pushed
          // any additional language, query, filters, etc...
          if (query != null && language != null && index != null) {
            return getQueryFilter(query, language, filters || [], index);
          } else {
            // user did not give any additional fall back mechanism for generating a rule
            // rethrow error for activity monitoring
            throw err;
          }
        }
      } else {
        throw new TypeError('savedId parameter should be defined');
      }
    }
  }
  return assertUnreachable(type);
};
