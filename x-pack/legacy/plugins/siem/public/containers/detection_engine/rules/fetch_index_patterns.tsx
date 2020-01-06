/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, isEqual, get } from 'lodash/fp';
import { useEffect, useState, Dispatch, SetStateAction } from 'react';

import { IIndexPattern } from '../../../../../../../../src/plugins/data/public';
import {
  BrowserFields,
  getBrowserFields,
  getIndexFields,
  sourceQuery,
} from '../../../containers/source';
import { useStateToaster } from '../../../components/toasters';
import { errorToToaster } from '../../../components/ml/api/error_to_toaster';
import { SourceQuery } from '../../../graphql/types';
import { useApolloClient } from '../../../utils/apollo_context';

import * as i18n from './translations';

interface FetchIndexPatternReturn {
  browserFields: BrowserFields | null;
  isLoading: boolean;
  indices: string[];
  indicesExists: boolean;
  indexPatterns: IIndexPattern | null;
}

type Return = [FetchIndexPatternReturn, Dispatch<SetStateAction<string[]>>];

export const useFetchIndexPatterns = (defaultIndices: string[] = []): Return => {
  const apolloClient = useApolloClient();
  const [indices, setIndices] = useState<string[]>(defaultIndices);
  const [indicesExists, setIndicesExists] = useState(false);
  const [indexPatterns, setIndexPatterns] = useState<IIndexPattern | null>(null);
  const [browserFields, setBrowserFields] = useState<BrowserFields | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    if (!isEqual(defaultIndices, indices)) {
      setIndices(defaultIndices);
    }
  }, [defaultIndices, indices]);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

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
                signal: abortCtrl.signal,
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
                setBrowserFields(getBrowserFields(get('data.source.status.indexFields', result)));
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

  return [{ browserFields, isLoading, indices, indicesExists, indexPatterns }, setIndices];
};
