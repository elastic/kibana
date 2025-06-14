/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiBasicTableColumn, EuiIcon, EuiLink } from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedDate } from '@kbn/i18n-react';

import { BadgesColumn } from '../../../common/components/assistant_settings_management/badges';
import { useInlineActions } from '../../../common/components/assistant_settings_management/inline_actions';
import { SYSTEM_PROMPT_DEFAULT_NEW_CONVERSATION } from '../system_prompt_modal/translations';
import * as i18n from './translations';
import { SystemPromptSettings } from '../../../settings/use_settings_updater/use_system_prompt_updater';

export const useSystemPromptTable = () => {
  const getActions = useInlineActions<SystemPromptSettings>();
  const getColumns = useCallback(
    ({
      isActionsDisabled,
      isDeleteEnabled,
      isEditEnabled,
      onEditActionClicked,
      onDeleteActionClicked,
    }: {
      isActionsDisabled: boolean;
      isDeleteEnabled: (conversation: SystemPromptSettings) => boolean;
      isEditEnabled: (conversation: SystemPromptSettings) => boolean;
      onEditActionClicked: (prompt: SystemPromptSettings) => void;
      onDeleteActionClicked: (prompt: SystemPromptSettings) => void;
    }): Array<EuiBasicTableColumn<SystemPromptSettings>> => [
      {
        align: 'left',
        name: i18n.SYSTEM_PROMPTS_TABLE_COLUMN_NAME,
        truncateText: { lines: 3 },
        render: (prompt: SystemPromptSettings) =>
          prompt?.name ? (
            <EuiLink onClick={() => onEditActionClicked(prompt)} disabled={isActionsDisabled}>
              {prompt?.name}
              {prompt.isNewConversationDefault && (
                <EuiIcon
                  type="starFilled"
                  aria-label={SYSTEM_PROMPT_DEFAULT_NEW_CONVERSATION}
                  className="eui-alignTop"
                />
              )}
            </EuiLink>
          ) : null,
        sortable: ({ name }: SystemPromptSettings) => name,
      },
      {
        align: 'left',
        name: i18n.SYSTEM_PROMPTS_TABLE_COLUMN_DEFAULT_CONVERSATIONS,
        render: ({ conversations, id }: SystemPromptSettings) => (
          <BadgesColumn items={conversations.map(({ title }) => title)} prefix={id} />
        ),
      },
      {
        align: 'left',
        field: 'updatedAt',
        name: i18n.SYSTEM_PROMPTS_TABLE_COLUMN_DATE_UPDATED,
        render: (updatedAt: SystemPromptSettings['updatedAt']) =>
          updatedAt ? (
            <EuiBadge color="hollow">
              <FormattedDate
                value={new Date(updatedAt)}
                year="numeric"
                month="2-digit"
                day="numeric"
              />
            </EuiBadge>
          ) : null,
        sortable: true,
      },
      {
        align: 'center',
        width: '120px',
        ...getActions({
          isDeleteEnabled,
          isEditEnabled,
          onDelete: onDeleteActionClicked,
          onEdit: onEditActionClicked,
        }),
      },
    ],
    [getActions]
  );

  return { getColumns };
};
