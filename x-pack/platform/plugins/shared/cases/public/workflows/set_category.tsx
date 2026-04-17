/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectionOption } from '@kbn/workflows/types/latest';
import { getCategories } from '../containers/api';
import { setCategoryStepCommonDefinition } from '../../common/workflows/steps/set_category';
import * as i18n from '../../common/workflows/translations';
import { createPublicCaseStepDefinition } from './shared';
import { isValidOwner } from '../../common/utils/owner';

const MAX_CATEGORIES_FOR_SELECTION = 15;

export const setCategoryStepDefinition = createPublicCaseStepDefinition({
  ...setCategoryStepCommonDefinition,
  editorHandlers: {
    input: {
      category: {
        selection: {
          dependsOnValues: ['input.owner'],
          search: async (input, ctx) => {
            const owner = ctx.values.input.owner;
            if (!isValidOwner(owner)) {
              return [];
            }
            const query = input.trim().toLowerCase();
            const categories = await getCategories({ owner: [owner] });

            const options: SelectionOption<string>[] = [];
            const categoryLimit = Math.min(categories.length, MAX_CATEGORIES_FOR_SELECTION);
            const queryIsEmpty = query.length === 0;

            for (let i = 0; i < categoryLimit; i++) {
              const category = categories[i];
              if (queryIsEmpty || category.toLowerCase().includes(query)) {
                options.push({ value: category, label: category });
              }
            }

            return options;
          },
          resolve: async (value, ctx) => {
            const owner = ctx.values.input.owner;
            const ownerFilter = isValidOwner(owner) ? [owner] : [];
            const categories = await getCategories({ owner: ownerFilter });
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
