/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCategories } from '../containers/api';
import { setCategoryStepCommonDefinition } from '../../common/workflows/steps/set_category';
import * as i18n from '../../common/workflows/translations';
import { collectSelectionSearchOptions } from './selection_search';
import { createPublicCaseStepDefinition } from './shared';
import { isValidOwner } from '../../common/utils/owner';

export const setCategoryStepDefinition = createPublicCaseStepDefinition({
  ...setCategoryStepCommonDefinition,
  editorHandlers: {
    input: {
      category: {
        selection: {
          dependsOnValues: ['input.owner'],
          search: async (input, ctx) => {
            const owner = ctx.values.input.owner;
            // If no owner is specified, keep the input, no need to verify categories
            if (!isValidOwner(owner)) {
              return input.length ? [{ value: input, label: input }] : [];
            }
            const query = input.trim().toLowerCase();
            const categories = await getCategories({ owner: [owner] });

            const queryIsEmpty = query.length === 0;

            return collectSelectionSearchOptions({
              items: categories,
              hasEmptyQuery: queryIsEmpty,
              matchesQuery: (category) => category.toLowerCase().includes(query),
              toOption: (category) => ({ value: category, label: category }),
            });
          },
          resolve: async (value, ctx) => {
            const owner = ctx.values.input.owner;
            // If no owner was specified, just accept the value. We do not need to verify categories.
            if (!isValidOwner(owner)) {
              return { value, label: value };
            }
            const categories = await getCategories({ owner: [owner] });
            const found = categories.find((cat) => cat === value);

            if (!found) {
              return null;
            }

            return { value: found, label: found };
          },
          getDetails: async (value, _context, option) => {
            if (option) {
              return { message: i18n.CATEGORY_CAN_BE_USED_MESSAGE(option.value) };
            }

            return { message: i18n.CATEGORY_NOT_FOUND_MESSAGE(value) };
          },
        },
      },
    },
  },
});
