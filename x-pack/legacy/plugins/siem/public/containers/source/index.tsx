/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isUndefined } from 'lodash';
import { get, keyBy, pick, set } from 'lodash/fp';
import { Query } from 'react-apollo';
import React from 'react';
import memoizeOne from 'memoize-one';
import { StaticIndexPattern } from 'ui/index_patterns';
import chrome from 'ui/chrome';

import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { IndexField, SourceQuery } from '../../graphql/types';

import { sourceQuery } from './index.gql_query';

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
  indexPattern: StaticIndexPattern;
}

interface WithSourceProps {
  children: (args: WithSourceArgs) => React.ReactNode;
  sourceId: string;
}

export const WithSource = React.memo<WithSourceProps>(({ children, sourceId }) => {
  const getIndexFields = (title: string, fields: IndexField[]): StaticIndexPattern =>
    fields && fields.length > 0
      ? {
          fields: fields.map(field => pick(['name', 'searchable', 'type', 'aggregatable'], field)),
          title,
        }
      : { fields: [], title };

  const getBrowserFields = (fields: IndexField[]): BrowserFields =>
    fields && fields.length > 0
      ? fields.reduce<BrowserFields>(
          (accumulator: BrowserFields, field: IndexField) =>
            set([field.category, 'fields', field.name], field, accumulator),
          {}
        )
      : {};
  const getBrowserFieldsMemo: (fields: IndexField[]) => BrowserFields = memoizeOne(
    getBrowserFields
  );
  const getIndexFieldsMemo: (
    title: string,
    fields: IndexField[]
  ) => StaticIndexPattern = memoizeOne(getIndexFields);
  return (
    <Query<SourceQuery.Query, SourceQuery.Variables>
      query={sourceQuery}
      fetchPolicy="cache-first"
      notifyOnNetworkStatusChange
      variables={{
        sourceId,
        defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
      }}
    >
      {({ data }) =>
        children({
          indicesExist: get('source.status.indicesExist', data),
          browserFields: getBrowserFieldsMemo(get('source.status.indexFields', data)),
          indexPattern: getIndexFieldsMemo(
            chrome
              .getUiSettingsClient()
              .get(DEFAULT_INDEX_KEY)
              .join(),
            get('source.status.indexFields', data)
          ),
        })
      }
    </Query>
  );
});

WithSource.displayName = 'WithSource';

export const indicesExistOrDataTemporarilyUnavailable = (indicesExist: boolean | undefined) =>
  indicesExist || isUndefined(indicesExist);
