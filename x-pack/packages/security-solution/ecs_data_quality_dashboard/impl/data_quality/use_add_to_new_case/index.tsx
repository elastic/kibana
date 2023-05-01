/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import * as i18n from './translations';

interface Props {
  canUserCreateAndReadCases: () => boolean;
  indexName?: string;
  onClick?: () => void;
  openCreateCaseFlyout: ({
    comments,
    headerContent,
  }: {
    comments: string[];
    headerContent?: React.ReactNode;
  }) => void;
}

export const useAddToNewCase = ({
  canUserCreateAndReadCases,
  indexName,
  onClick,
  openCreateCaseFlyout,
}: Props): {
  disabled: boolean;
  onAddToNewCase: (markdownComments: string[]) => void;
} => {
  const headerContent = useMemo(
    () => (
      <div>
        {indexName != null
          ? i18n.CREATE_A_DATA_QUALITY_CASE_FOR_INDEX(indexName)
          : i18n.CREATE_A_DATA_QUALITY_CASE}
      </div>
    ),
    [indexName]
  );

  const onAddToNewCase = useCallback(
    (markdownComments: string[]) => {
      if (onClick) {
        onClick();
      }

      openCreateCaseFlyout({ comments: markdownComments, headerContent });
    },
    [headerContent, onClick, openCreateCaseFlyout]
  );

  return {
    disabled: !canUserCreateAndReadCases(),
    onAddToNewCase,
  };
};
