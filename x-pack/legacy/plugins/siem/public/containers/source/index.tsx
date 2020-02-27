/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isUndefined } from 'lodash';
import { get, keyBy, pick, set, isEmpty } from 'lodash/fp';
import { useMemo } from 'react';
import memoizeOne from 'memoize-one';
import { IIndexPattern } from 'src/plugins/data/public';

import { useUiSetting$ } from '../../lib/kibana';

import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { IndexField, useSourceQueryQuery } from '../../graphql/types';

import { sourceQuery } from './index.gql_query';

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

export const indicesExistOrDataTemporarilyUnavailable = (indicesExist: boolean | undefined) =>
  indicesExist || isUndefined(indicesExist);

export const useWithSource = (indexToAdd?: string[] | null, sourceId: string = 'default') => {
  const [configIndex] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const defaultIndex = useMemo<string[]>(() => {
    if (indexToAdd != null && !isEmpty(indexToAdd)) {
      return [...configIndex, ...indexToAdd];
    }
    return configIndex;
  }, [configIndex, indexToAdd]);

  const variables = {
    sourceId,
    defaultIndex,
  };

  const { data } = useSourceQueryQuery({
    fetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
    variables,
  });

  const indicesExist = get('source.status.indicesExist', data);
  const browserFields = getBrowserFields(
    defaultIndex.join(),
    get('source.status.indexFields', data)
  );
  const indexPattern = getIndexFields(defaultIndex.join(), get('source.status.indexFields', data));
  const contentAvailable = indicesExistOrDataTemporarilyUnavailable(indicesExist);

  return {
    browserFields,
    indexPattern,
    contentAvailable,
  };
};
