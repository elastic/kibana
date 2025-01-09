/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type {
  SavedObjectsTaggingApiUi,
  GetSearchBarFilterOptions,
} from '@kbn/saved-objects-tagging-oss-plugin/public';

import type { Tag } from '../../common/types';
import { TagSearchBarOption } from '../components';

export interface BuildGetSearchBarFilterOptions {
  getTagList: () => Tag[];
}

export const buildGetSearchBarFilter = ({
  getTagList,
}: BuildGetSearchBarFilterOptions): SavedObjectsTaggingApiUi['getSearchBarFilter'] => {
  return ({ useName = true, tagField = 'tag' }: GetSearchBarFilterOptions = {}) => {
    return {
      type: 'field_value_selection',
      field: tagField,
      name: i18n.translate('xpack.savedObjectsTagging.uiApi.searchBar.filterButtonLabel', {
        defaultMessage: 'Tags',
      }),
      multiSelect: 'or',
      options: () => {
        // we are using the promise version of `options` because the handler is called
        // everytime the filter is opened. That way we can keep in sync in case of tags
        // that would be added without the searchbar having trigger a re-render.
        return Promise.resolve(
          getTagList().map((tag) => {
            return {
              value: useName ? tag.name : tag.id,
              name: tag.name,
              view: <TagSearchBarOption tag={tag} />,
            };
          })
        );
      },
    };
  };
};
