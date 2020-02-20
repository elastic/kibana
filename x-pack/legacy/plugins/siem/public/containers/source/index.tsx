/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isUndefined } from 'lodash';
import { get, keyBy, pick, set, isEmpty } from 'lodash/fp';
import { Query } from 'react-apollo';
import React, { useEffect, useMemo, useState } from 'react';
import memoizeOne from 'memoize-one';
import { IIndexPattern } from 'src/plugins/data/public';
import { useUiSetting$ } from '../../lib/kibana';

import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { IndexField, SourceQuery } from '../../graphql/types';

import { sourceQuery } from './index.gql_query';
import { useApolloClient } from '../../utils/apollo_context';

export { sourceQuery };

export interface BrowserField {
  aggregatable: boolean;
  category: string;
  description: string | null;
  example: string | number | null;
  fields: Readonly<Record<string, Partial<BrowserField>>>;
  format: string;
  indexes: string[];
  name: string;
  searchable: boolean;
  type: string;
}

export type BrowserFields = Readonly<Record<string, Partial<BrowserField>>>;

export const getAllBrowserFields = (browserFields: BrowserFields): Array<Partial<BrowserField>> =>
  Object.values(browserFields).reduce<Array<Partial<BrowserField>>>(
    (acc, namespace) => [
      ...acc,
      ...Object.values(namespace.fields != null ? namespace.fields : {}),
    ],
    []
  );

export const getAllFieldsByName = (
  browserFields: BrowserFields
): { [fieldName: string]: Partial<BrowserField> } =>
  keyBy('name', getAllBrowserFields(browserFields));

interface WithSourceArgs {
  indicesExist: boolean;
  browserFields: BrowserFields;
  indexPattern: IIndexPattern;
}

interface WithSourceProps {
  children: (args: WithSourceArgs) => React.ReactNode;
  indexToAdd?: string[] | null;
  sourceId: string;
}

export const getIndexFields = memoizeOne(
  (title: string, fields: IndexField[]): IIndexPattern =>
    fields && fields.length > 0
      ? {
          fields: fields.map(field => pick(['name', 'searchable', 'type', 'aggregatable'], field)),
          title,
        }
      : { fields: [], title }
);

export const getBrowserFields = memoizeOne(
  (title: string, fields: IndexField[]): BrowserFields =>
    fields && fields.length > 0
      ? fields.reduce<BrowserFields>(
          (accumulator: BrowserFields, field: IndexField) =>
            set([field.category, 'fields', field.name], field, accumulator),
          {}
        )
      : {}
);

export const WithSource = React.memo<WithSourceProps>(({ children, indexToAdd, sourceId }) => {
  const [configIndex] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const defaultIndex = useMemo<string[]>(() => {
    if (indexToAdd != null && !isEmpty(indexToAdd)) {
      return [...configIndex, ...indexToAdd];
    }
    return configIndex;
  }, [configIndex, indexToAdd]);

  return (
    <Query<SourceQuery.Query, SourceQuery.Variables>
      query={sourceQuery}
      fetchPolicy="cache-first"
      notifyOnNetworkStatusChange
      variables={{
        sourceId,
        defaultIndex,
      }}
    >
      {({ data }) =>
        children({
          indicesExist: get('source.status.indicesExist', data),
          browserFields: getBrowserFields(
            defaultIndex.join(),
            get('source.status.indexFields', data)
          ),
          indexPattern: getIndexFields(defaultIndex.join(), get('source.status.indexFields', data)),
        })
      }
    </Query>
  );
});

WithSource.displayName = 'WithSource';

export const indicesExistOrDataTemporarilyUnavailable = (indicesExist: boolean | undefined) =>
  indicesExist || isUndefined(indicesExist);

export const useWithSource = (sourceId: string, indices: string[]) => {
  const [loading, updateLoading] = useState(false);
  const [indicesExist, setIndicesExist] = useState<boolean | undefined | null>(undefined);
  const [browserFields, setBrowserFields] = useState<BrowserFields | null>(null);
  const [indexPattern, setIndexPattern] = useState<IIndexPattern | null>(null);
  const [errorMessage, updateErrorMessage] = useState<string | null>(null);

  const apolloClient = useApolloClient();
  async function fetchSource(signal: AbortSignal) {
    updateLoading(true);
    if (apolloClient) {
      apolloClient
        .query<SourceQuery.Query, SourceQuery.Variables>({
          query: sourceQuery,
          fetchPolicy: 'cache-first',
          variables: {
            sourceId,
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
            updateLoading(false);
            updateErrorMessage(null);
            setIndicesExist(get('data.source.status.indicesExist', result));
            setBrowserFields(
              getBrowserFields(indices.join(), get('data.source.status.indexFields', result))
            );
            setIndexPattern(
              getIndexFields(indices.join(), get('data.source.status.indexFields', result))
            );
          },
          error => {
            updateLoading(false);
            updateErrorMessage(error.message);
          }
        );
    }
  }

  useEffect(() => {
    const abortCtrl = new AbortController();
    const signal = abortCtrl.signal;
    fetchSource(signal);
    return () => abortCtrl.abort();
  }, [apolloClient, sourceId, indices]);

  return { indicesExist, browserFields, indexPattern, loading, errorMessage };
};
