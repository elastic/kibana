/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { filter, get, pickBy } from 'lodash/fp';
import styled from 'styled-components';

import { BrowserField, BrowserFields } from '../../containers/source';
import {
  DEFAULT_CATEGORY_NAME,
  defaultHeaders,
} from '../timeline/body/column_headers/default_headers';

export const LoadingSpinner = styled(EuiLoadingSpinner)`
  cursor: pointer;
  position: relative;
  top: 3px;
`;

LoadingSpinner.displayName = 'LoadingSpinner';

export const CATEGORY_PANE_WIDTH = 200;
export const DESCRIPTION_COLUMN_WIDTH = 300;
export const FIELD_COLUMN_WIDTH = 200;
export const FIELD_BROWSER_WIDTH = 900;
export const FIELD_BROWSER_HEIGHT = 300;
export const FIELDS_PANE_WIDTH = 670;
export const HEADER_HEIGHT = 40;
export const PANES_FLEX_GROUP_WIDTH = CATEGORY_PANE_WIDTH + FIELDS_PANE_WIDTH + 10;
export const SEARCH_INPUT_WIDTH = 850;
export const TABLE_HEIGHT = 260;
export const TYPE_COLUMN_WIDTH = 50;

/**
 * Returns the CSS class name for the title of a category shown in the left
 * side field browser
 */
export const getCategoryPaneCategoryClassName = ({
  categoryId,
  timelineId,
}: {
  categoryId: string;
  timelineId: string;
}): string => `field-browser-category-pane-${categoryId}-${timelineId}`;

/**
 * Returns the CSS class name for the title of a category shown in the right
 * side of field browser
 */
export const getFieldBrowserCategoryTitleClassName = ({
  categoryId,
  timelineId,
}: {
  categoryId: string;
  timelineId: string;
}): string => `field-browser-category-title-${categoryId}-${timelineId}`;

/** Returns the class name for a field browser search input */
export const getFieldBrowserSearchInputClassName = (timelineId: string): string =>
  `field-browser-search-input-${timelineId}`;

/** Returns true if the specified category has at least one field */
export const categoryHasFields = (category: Partial<BrowserField>): boolean =>
  category.fields != null && Object.keys(category.fields).length > 0;

/** Returns the count of fields in the specified category */
export const getFieldCount = (category: Partial<BrowserField> | undefined): number =>
  category != null && category.fields != null ? Object.keys(category.fields).length : 0;

/**
 * Filters the specified `BrowserFields` to return a new collection where every
 * category contains at least one field name that matches the specified substring.
 */
export const filterBrowserFieldsByFieldName = ({
  browserFields,
  substring,
}: {
  browserFields: BrowserFields;
  substring: string;
}): BrowserFields => {
  const trimmedSubstring = substring.trim();

  // filter each category such that it only contains fields with field names
  // that contain the specified substring:
  const filteredBrowserFields: BrowserFields = Object.keys(browserFields).reduce(
    (filteredCategories, categoryId) => ({
      ...filteredCategories,
      [categoryId]: {
        ...browserFields[categoryId],
        fields: filter(
          f => f.name != null && f.name.includes(trimmedSubstring),
          browserFields[categoryId].fields
        ).reduce((filtered, field) => ({ ...filtered, [field.name!]: field }), {}),
      },
    }),
    {}
  );

  // only pick non-empty categories from the filtered browser fields
  const nonEmptyCategories: BrowserFields = pickBy(
    category => categoryHasFields(category),
    filteredBrowserFields
  );

  return nonEmptyCategories;
};

/**
 * Returns a "virtual" category (e.g. default ECS) from the specified fieldIds
 */
export const createVirtualCategory = ({
  browserFields,
  fieldIds,
}: {
  browserFields: BrowserFields;
  fieldIds: string[];
}): Partial<BrowserField> => ({
  fields: fieldIds.reduce<Readonly<Record<string, Partial<BrowserField>>>>((fields, fieldId) => {
    const splitId = fieldId.split('.'); // source.geo.city_name -> [source, geo, city_name]

    return {
      ...fields,
      [fieldId]: {
        ...get([splitId.length > 1 ? splitId[0] : 'base', 'fields', fieldId], browserFields),
        name: fieldId,
      },
    };
  }, {}),
});

/** Merges the specified browser fields with the default category (i.e. `default ECS`) */
export const mergeBrowserFieldsWithDefaultCategory = (
  browserFields: BrowserFields
): BrowserFields => ({
  ...browserFields,
  [DEFAULT_CATEGORY_NAME]: createVirtualCategory({
    browserFields,
    fieldIds: defaultHeaders.map(header => header.id),
  }),
});
