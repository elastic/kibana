/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import { getPromptById } from '../helpers';
import * as i18n from './translations';
import type { Prompt } from '../../types';
import { SelectSystemPrompt } from './select_system_prompt';

const SystemPromptText = styled(EuiText)`
  white-space: pre-line;
`;

interface Props {
  selectedSystemPromptId: string | null;
  setSelectedSystemPromptId: React.Dispatch<React.SetStateAction<string | null>>;
  systemPrompts: Prompt[];
}

const SystemPromptComponent: React.FC<Props> = ({
  selectedSystemPromptId,
  setSelectedSystemPromptId,
  systemPrompts,
}) => {
  const [showSelectSystemPrompt, setShowSelectSystemPrompt] = React.useState<boolean>(false);

  const selectedPrompt: Prompt | undefined = useMemo(
    () => getPromptById({ prompts: systemPrompts, id: selectedSystemPromptId ?? '' }),
    [systemPrompts, selectedSystemPromptId]
  );

  const clearSystemPrompt = useCallback(() => {
    setSelectedSystemPromptId(null);
    setShowSelectSystemPrompt(false);
  }, [setSelectedSystemPromptId]);

  const onShowSelectSystemPrompt = useCallback(() => setShowSelectSystemPrompt(true), []);

  return (
    <div data-test-subj="systemPrompt">
      {selectedPrompt == null || showSelectSystemPrompt ? (
        <SelectSystemPrompt
          selectedPrompt={selectedPrompt}
          setSelectedSystemPromptId={setSelectedSystemPromptId}
          setShowSelectSystemPrompt={setShowSelectSystemPrompt}
          showSelectSystemPrompt={showSelectSystemPrompt}
          systemPrompts={systemPrompts}
        />
      ) : (
        <EuiFlexGroup alignItems="flexStart" gutterSize="none">
          <EuiFlexItem grow>
            <SystemPromptText
              color="subdued"
              data-test-subj="systemPromptText"
              onClick={onShowSelectSystemPrompt}
            >
              {selectedPrompt?.content ?? ''}
            </SystemPromptText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none">
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.SELECT_A_SYSTEM_PROMPT}>
                  <EuiButtonIcon
                    aria-label={i18n.SELECT_A_SYSTEM_PROMPT}
                    data-test-subj="edit"
                    iconType="documentEdit"
                    onClick={onShowSelectSystemPrompt}
                  />
                </EuiToolTip>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.CLEAR_SYSTEM_PROMPT}>
                  <EuiButtonIcon
                    aria-label={i18n.CLEAR_SYSTEM_PROMPT}
                    data-test-subj="clear"
                    iconType="cross"
                    onClick={clearSystemPrompt}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </div>
  );
};

SystemPromptComponent.displayName = 'SystemPromptComponent';

export const SystemPrompt = React.memo(SystemPromptComponent);
