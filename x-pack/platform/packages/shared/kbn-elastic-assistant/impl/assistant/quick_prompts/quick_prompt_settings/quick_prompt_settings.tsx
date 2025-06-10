/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiText, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

import { PromptResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import { EuiSetColorMethod } from '@elastic/eui/src/services/color_picker/color_picker';
import * as i18n from './translations';
import { QuickPromptSettingsEditor } from './quick_prompt_editor';
import { PromptContextTemplate } from '../../../..';

interface Props {
  onPromptContentChange: (newValue: string) => void;
  onQuickPromptColorChange: EuiSetColorMethod;
  onQuickPromptContextChange: (promptContexts: PromptContextTemplate[]) => void;
  onQuickPromptDelete: (id: string) => void;
  onQuickPromptSelect: (quickPrompt?: PromptResponse | string) => void;
  resetSettings?: () => void;
  selectedQuickPrompt: PromptResponse | undefined;
  quickPromptSettings: PromptResponse[];
}

/**
 * Settings adding/removing quick prompts. Configure name, color, prompt and category.
 */
export const QuickPromptSettings: React.FC<Props> = React.memo<Props>(
  ({
    onPromptContentChange,
    onQuickPromptColorChange,
    onQuickPromptContextChange,
    onQuickPromptDelete,
    onQuickPromptSelect,
    resetSettings,
    selectedQuickPrompt,
    quickPromptSettings,
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
          onPromptContentChange={onPromptContentChange}
          onQuickPromptColorChange={onQuickPromptColorChange}
          onQuickPromptContextChange={onQuickPromptContextChange}
          onQuickPromptDelete={onQuickPromptDelete}
          onQuickPromptSelect={onQuickPromptSelect}
          resetSettings={resetSettings}
          selectedQuickPrompt={selectedQuickPrompt}
          quickPromptSettings={quickPromptSettings}
        />
      </>
    );
  }
);

QuickPromptSettings.displayName = 'AddQuickPromptModal';
