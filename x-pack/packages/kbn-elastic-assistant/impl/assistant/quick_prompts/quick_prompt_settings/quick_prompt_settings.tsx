/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiText, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

import {
  PromptResponse,
  PerformBulkActionRequestBody as PromptsPerformBulkActionRequestBody,
} from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';
import * as i18n from './translations';
import { QuickPromptSettingsEditor } from './quick_prompt_editor';

interface Props {
  onSelectedQuickPromptChange: (quickPrompt?: PromptResponse) => void;
  quickPromptSettings: PromptResponse[];
  selectedQuickPrompt: PromptResponse | undefined;
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<PromptResponse[]>>;
  promptsBulkActions: PromptsPerformBulkActionRequestBody;
  setPromptsBulkActions: React.Dispatch<React.SetStateAction<PromptsPerformBulkActionRequestBody>>;
}

/**
 * Settings adding/removing quick prompts. Configure name, color, prompt and category.
 */
export const QuickPromptSettings: React.FC<Props> = React.memo<Props>(
  ({
    onSelectedQuickPromptChange,
    quickPromptSettings,
    selectedQuickPrompt,
    setUpdatedQuickPromptSettings,
    promptsBulkActions,
    setPromptsBulkActions,
  }) => {
    return (
      <>
        <EuiTitle size={'s'}>
          <h2>{i18n.SETTINGS_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size={'s'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
        <EuiHorizontalRule margin={'s'} />

        <QuickPromptSettingsEditor
          onSelectedQuickPromptChange={onSelectedQuickPromptChange}
          quickPromptSettings={quickPromptSettings}
          selectedQuickPrompt={selectedQuickPrompt}
          setUpdatedQuickPromptSettings={setUpdatedQuickPromptSettings}
          promptsBulkActions={promptsBulkActions}
          setPromptsBulkActions={setPromptsBulkActions}
        />
      </>
    );
  }
);

QuickPromptSettings.displayName = 'AddQuickPromptModal';
