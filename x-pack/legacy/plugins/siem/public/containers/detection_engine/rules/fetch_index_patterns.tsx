/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, get } from 'lodash/fp';
import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { StaticIndexPattern } from 'ui/index_patterns';

import { getIndexFields, sourceQuery } from '../../../containers/source';
import { useStateToaster } from '../../../components/toasters';
import { errorToToaster } from '../../../components/ml/api/error_to_toaster';
import { SourceQuery } from '../../../graphql/types';
import { useApolloClient } from '../../../utils/apollo_context';

import * as i18n from './translations';

interface FetchIndexPattern {
  isLoading: boolean;
  indices: string[];
  indicesExists: boolean;
  indexPatterns: StaticIndexPattern | null;
}

type Return = [FetchIndexPattern, Dispatch<SetStateAction<string[]>>];

export const useFetchIndexPatterns = (): Return => {
  const apolloClient = useApolloClient();
  const [indices, setIndices] = useState<string[]>([]);
  const [indicesExists, setIndicesExists] = useState(false);
  const [indexPatterns, setIndexPatterns] = useState<StaticIndexPattern | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    const signal = abortCtrl.signal;

    async function fetchIndexPatterns() {
      if (apolloClient && !isEmpty(indices)) {
        setIsLoading(true);
        apolloClient
          .query<SourceQuery.Query, SourceQuery.Variables>({
            query: sourceQuery,
            fetchPolicy: 'cache-first',
            variables: {
              sourceId: 'default',
              defaultIndex: indices,
            },
            context: {
              fetchOptions: {
                signal,
              },
            },
          })
          .then(
            result => {
              if (isSubscribed) {
                setIsLoading(false);
                setIndicesExists(get('data.source.status.indicesExist', result));
                setIndexPatterns(
                  getIndexFields(indices.join(), get('data.source.status.indexFields', result))
                );
              }
            },
            error => {
              if (isSubscribed) {
                setIsLoading(false);
                errorToToaster({ title: i18n.RULE_ADD_FAILURE, error, dispatchToaster });
              }
            }
          );
      }
    }
    fetchIndexPatterns();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [indices]);

  return [{ isLoading, indices, indicesExists, indexPatterns }, setIndices];
};
