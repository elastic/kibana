/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr, isEmpty, uniqBy } from 'lodash/fp';

import { BrowserField, BrowserFields } from '../../containers/source';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { DEFAULT_DATE_COLUMN_MIN_WIDTH, DEFAULT_COLUMN_MIN_WIDTH } from '../timeline/body/helpers';
import { Scalars } from '../../graphql/types';

import * as i18n from './translations';

/**
 * Defines the behavior of the search input that appears above the table of data
 */
export const search = {
  box: {
    incremental: true,
    placeholder: i18n.PLACEHOLDER,
    schema: {
      fieldId: {
        type: 'string',
      },
      valuesFlattened: {
        type: 'string',
      },
      description: {
        type: 'string',
      },
    },
  },
};

export interface ItemValues {
  value: JSX.Element;
  valueAsString: string;
}

/**
 * An item rendered in the table
 */
export interface Item {
  description: string;
  field: JSX.Element;
  fieldId: string;
  type: string;
  values: Scalars['ToStringArray'];
}

export const getColumnHeaderFromBrowserField = ({
  browserField,
  width = DEFAULT_COLUMN_MIN_WIDTH,
}: {
  browserField: Partial<BrowserField>;
  width?: number;
}): ColumnHeader => ({
  category: browserField.category,
  columnHeaderType: 'not-filtered',
  description: browserField.description != null ? browserField.description : undefined,
  example: browserField.example != null ? `${browserField.example}` : undefined,
  id: browserField.name || '',
  type: browserField.type,
  aggregatable: browserField.aggregatable,
  width,
});

/**
 * Returns a collection of columns, where the first column in the collection
 * is a timestamp, and the remaining columns are all the columns in the
 * specified category
 */
export const getColumnsWithTimestamp = ({
  browserFields,
  category,
}: {
  browserFields: BrowserFields;
  category: string;
}): ColumnHeader[] => {
  const emptyFields: Record<string, Partial<BrowserField>> = {};
  const timestamp = get('base.fields.@timestamp', browserFields);
  const categoryFields: Array<Partial<BrowserField>> = [
    ...Object.values(getOr(emptyFields, `${category}.fields`, browserFields)),
  ];

  return timestamp != null && categoryFields.length
    ? uniqBy('id', [
        getColumnHeaderFromBrowserField({
          browserField: timestamp,
          width: DEFAULT_DATE_COLUMN_MIN_WIDTH,
        }),
        ...categoryFields.map(f => getColumnHeaderFromBrowserField({ browserField: f })),
      ])
    : [];
};

/** Returns example text, or an empty string if the field does not have an example */
export const getExampleText = (example: string | number | null | undefined): string =>
  !isEmpty(example) ? `Example: ${example}` : '';

export const getIconFromType = (type: string | null) => {
  switch (type) {
    case 'string': // fall through
    case 'keyword':
      return 'string';
    case 'number': // fall through
    case 'long':
      return 'number';
    case 'date':
      return 'clock';
    case 'ip':
      return 'globe';
    case 'object':
      return 'questionInCircle';
    case 'float':
      return 'number';
    default:
      return 'questionInCircle';
  }
};
