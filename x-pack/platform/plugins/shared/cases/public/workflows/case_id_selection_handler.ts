/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectionOption } from '@kbn/workflows/types/latest';
import { SortFieldCase } from '../../common/ui';
import { getCases, resolveCase } from '../containers/api';
import { DEFAULT_FILTER_OPTIONS } from '../containers/constants';
import * as i18n from './translations';

interface CaseSelectionShape {
  id: string;
  title: string;
  description: string;
}

const toCaseSelectionOption = (theCase: CaseSelectionShape): SelectionOption<string> => ({
  value: theCase.id,
  label: theCase.title,
  description: theCase.description,
});

export const caseIdSelection = {
  search: async (input: string) => {
    const query = input.trim();
    if (query.length === 0) {
      return [];
    }

    const response = await getCases({
      filterOptions: {
        ...DEFAULT_FILTER_OPTIONS,
        search: query,
        searchFields: ['title'],
      },
      queryParams: {
        page: 1,
        perPage: 10,
        sortField: SortFieldCase.updatedAt,
        sortOrder: 'desc',
      },
    });

    return response.cases.map((theCase) => toCaseSelectionOption(theCase));
  },
  resolve: async (value: string) => {
    const caseId = value.trim();
    if (caseId.length === 0) {
      return null;
    }

    try {
      const response = await resolveCase({ caseId });
      return toCaseSelectionOption(response.case);
    } catch {
      return null;
    }
  },
  getDetails: async (value: string, _context: unknown, option: SelectionOption<string> | null) => {
    if (option) {
      return {
        message: i18n.CASE_CAN_BE_USED_MESSAGE(option.label),
      };
    }

    return {
      message: i18n.CASE_NOT_FOUND_MESSAGE(value),
    };
  },
};

export const caseIdInputEditorHandlers = {
  input: {
    case_id: {
      selection: caseIdSelection,
    },
  },
};
