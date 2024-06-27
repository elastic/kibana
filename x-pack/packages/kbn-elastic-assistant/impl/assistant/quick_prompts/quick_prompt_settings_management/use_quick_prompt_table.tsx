/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn, EuiLink } from '@elastic/eui';
import React, { useCallback } from 'react';
import { BadgesColumn } from '../../common/components/assistant_settings_management/badges';
import { RowActions } from '../../common/components/assistant_settings_management/row_actions';
import { PromptContextTemplate } from '../../prompt_context/types';
import { QuickPrompt } from '../types';
import * as i18n from './translations';

export const useQuickPromptTable = () => {
  const getColumns = useCallback(
    ({
      basePromptContexts,
      onEditActionClicked,
      onDeleteActionClicked,
    }: {
      basePromptContexts: PromptContextTemplate[];
      onEditActionClicked: (prompt: QuickPrompt) => void;
      onDeleteActionClicked: (prompt: QuickPrompt) => void;
    }): Array<EuiBasicTableColumn<QuickPrompt>> => [
      {
        align: 'left',
        name: i18n.QUICK_PROMPTS_TABLE_COLUMN_NAME,
        render: (prompt: QuickPrompt) =>
          prompt?.title ? (
            <EuiLink onClick={() => onEditActionClicked(prompt)}>{prompt?.title}</EuiLink>
          ) : null,
        sortable: ({ title }: QuickPrompt) => title,
      },
      {
        align: 'left',
        name: i18n.QUICK_PROMPTS_TABLE_COLUMN_CONTEXTS,
        render: (prompt: QuickPrompt) => {
          const selectedPromptContexts = (
            basePromptContexts.filter((bpc) =>
              prompt?.categories?.some((cat) => bpc?.category === cat)
            ) ?? []
          ).map((bpc) => bpc?.description);
          return selectedPromptContexts ? (
            <BadgesColumn items={selectedPromptContexts} prefix={prompt.title} />
          ) : null;
        },
      },
      /* TODO: enable when createdAt is added
      {
        align: 'left',
        field: 'createdAt',
        name: i18n.QUICK_PROMPTS_TABLE_COLUMN_CREATED_AT,
      },
      */
      {
        align: 'center',
        name: i18n.QUICK_PROMPTS_TABLE_COLUMN_ACTIONS,
        width: '120px',
        render: (prompt: QuickPrompt) => {
          if (!prompt) {
            return null;
          }
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
