/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { sortBy, uniqBy } from 'lodash';
import type { CaseUI } from '../../../../common';
import type { MultiSelectFilterOption } from '../../all_cases/multi_select_filter';
import { MultiSelectFilter } from '../../all_cases/multi_select_filter';
import { getAttachmentAuthorKey, getAttachmentAuthorLabel } from './helpers';
import * as i18n from './translations';

export const AUTHOR_FILTER_ID = 'author';

/**
 * Build the de-duplicated, alphabetically sorted list of author options from a
 * case's comments. Authors with no usable identity (no profileUid, username,
 * or email) are dropped.
 */
const buildAuthorFilterOptions = (
  comments: CaseUI['comments']
): Array<MultiSelectFilterOption<string>> => {
  const options = comments.reduce<Array<MultiSelectFilterOption<string>>>((acc, comment) => {
    const key = getAttachmentAuthorKey(comment.createdBy);
    if (key !== '') {
      acc.push({ key, label: getAttachmentAuthorLabel(comment.createdBy) });
    }
    return acc;
  }, []);
  return sortBy(uniqBy(options, 'key'), 'label');
};

interface AuthorFilterProps {
  caseData: CaseUI;
  isLoading?: boolean;
  selectedAuthors: string[];
  onAuthorsChange: (selectedAuthors: string[]) => void;
}

export const AuthorFilter = React.memo<AuthorFilterProps>(
  ({ caseData, selectedAuthors, onAuthorsChange, isLoading = false }) => {
    const options = useMemo(() => buildAuthorFilterOptions(caseData.comments), [caseData.comments]);

    const onChange = useCallback(
      ({ selectedOptionKeys }: { filterId: string; selectedOptionKeys: string[] }) => {
        onAuthorsChange(selectedOptionKeys);
      },
      [onAuthorsChange]
    );

    return (
      <MultiSelectFilter
        id={AUTHOR_FILTER_ID}
        buttonLabel={i18n.AUTHOR}
        onChange={onChange}
        options={options}
        selectedOptionKeys={selectedAuthors}
        isLoading={isLoading}
      />
    );
  }
);

AuthorFilter.displayName = 'AuthorFilter';
