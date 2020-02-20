/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { IUiSettingsClient } from 'src/core/public';
import {
  getIndexPatternById,
  getIndexPatternsContract,
  getIndexPatternAndSavedSearch,
} from '../util/index_utils';
import { createSearchItems } from '../jobs/new_job/utils/new_job_utils';
import { ResolverResults, Resolvers } from './resolvers';
import { MlContextValue } from '../contexts/ml';

export const useResolver = (
  indexPatternId: string | undefined,
  savedSearchId: string | undefined,
  config: IUiSettingsClient,
  resolvers: Resolvers
): { context: MlContextValue; results: ResolverResults } => {
  const funcNames = Object.keys(resolvers); // Object.entries gets this wrong?!
  const funcs = Object.values(resolvers); // Object.entries gets this wrong?!
  const tempResults = funcNames.reduce((p, c) => {
    p[c] = {};
    return p;
  }, {} as ResolverResults);

  const [context, setContext] = useState<any | null>(null);
  const [results, setResults] = useState(tempResults);

  useEffect(() => {
    (async () => {
      try {
        const res = await Promise.all(funcs.map(r => r()));
        res.forEach((r, i) => (tempResults[funcNames[i]] = r));
        setResults(tempResults);

        if (indexPatternId !== undefined || savedSearchId !== undefined) {
          // note, currently we're using our own kibana context that requires a current index pattern to be set
          // this means, if the page uses this context, useResolver must be passed a string for the index pattern id
          // and loadIndexPatterns must be part of the resolvers.
          const { indexPattern, savedSearch } =
            savedSearchId !== undefined
              ? await getIndexPatternAndSavedSearch(savedSearchId)
              : { savedSearch: null, indexPattern: await getIndexPatternById(indexPatternId!) };

          const { combinedQuery } = createSearchItems(config, indexPattern!, savedSearch);

          setContext({
            combinedQuery,
            currentIndexPattern: indexPattern,
            currentSavedSearch: savedSearch,
            indexPatterns: getIndexPatternsContract()!,
            kibanaConfig: config,
          });
        } else {
          setContext({});
        }
      } catch (error) {
        // quietly fail. Let the resolvers handle the redirection if any fail to resolve
      }
    })();
  }, []);

  return { context, results };
};
