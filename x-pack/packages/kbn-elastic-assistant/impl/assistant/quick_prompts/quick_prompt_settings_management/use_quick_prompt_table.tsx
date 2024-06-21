/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React, { useCallback } from 'react';
import { BadgesColumn } from '../../common/components/assistant_settings_management/badges';
import { RowActions } from '../../common/components/assistant_settings_management/row_actions';
import { QuickPrompt } from '../types';
import * as i18n from './translations';

export const useQuickPromptTable = () => {
  const getColumns = useCallback(
    ({
      onEditActionClicked,
      onDeleteActionClicked,
    }: {
      onEditActionClicked: (prompt: QuickPrompt) => void;
      onDeleteActionClicked: (prompt: QuickPrompt) => void;
    }) => [
      {
        name: i18n.QUICK_PROMPTS_TABLE_COLUMN_NAME,
        render: (prompt: QuickPrompt) =>
          prompt?.title ? (
            <EuiLink onClick={() => onEditActionClicked(prompt)}>{prompt?.title}</EuiLink>
          ) : null,
      },
      {
        field: 'categories',
        name: i18n.QUICK_PROMPTS_TABLE_COLUMN_CONTEXTS,
        render: (categories: QuickPrompt['categories']) => <BadgesColumn items={categories} />,
      },
      /* TODO: enable when createdAt is added
      {
        field: 'createdAt',
        name: i18n.QUICK_PROMPTS_TABLE_COLUMN_CREATED_AT,
      },
      */
      {
        name: i18n.QUICK_PROMPTS_TABLE_COLUMN_ACTIONS,
        width: '120px',
        render: (prompt: QuickPrompt) => {
          const isDeletable = !prompt.isDefault;
          return (
            <RowActions<QuickPrompt>
              rowItem={prompt}
              onDelete={isDeletable ? onDeleteActionClicked : undefined}
              onEdit={onEditActionClicked}
              isDeletable={isDeletable}
            />
          );
        },
      },
    ],
    []
  );

  return { getColumns };
};
