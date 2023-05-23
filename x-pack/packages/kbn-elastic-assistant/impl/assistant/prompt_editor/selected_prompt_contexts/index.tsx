/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { SYSTEM_PROMPT_CONTEXT_NON_I18N } from '../../../content/prompts/system/translations';
import type { PromptContext } from '../../prompt_context/types';

const PromptContextText = styled(EuiText)`
  white-space: pre-line;
`;

interface Props {
  isNewConversation: boolean;
  promptContexts: Record<string, PromptContext>;
  selectedPromptContextIds: string[];
  setSelectedPromptContextIds: React.Dispatch<React.SetStateAction<string[]>>;
}

const SelectedPromptContextsComponent: React.FC<Props> = ({
  isNewConversation,
  promptContexts,
  selectedPromptContextIds,
  setSelectedPromptContextIds,
}) => {
  const selectedPromptContexts = useMemo(
    () => selectedPromptContextIds.map((id) => promptContexts[id]),
    [promptContexts, selectedPromptContextIds]
  );

  const [accordianContent, setAccordianContent] = useState<Record<string, string>>({});

  const unselectPromptContext = useCallback(
    (unselectedId: string) => {
      setSelectedPromptContextIds((prev) => prev.filter((id) => id !== unselectedId));
    },
    [setSelectedPromptContextIds]
  );

  useEffect(() => {
    const fetchAccordianContent = async () => {
      const newAccordianContent = await Promise.all(
        selectedPromptContexts.map(async ({ getPromptContext, id }) => ({
          [id]: await getPromptContext(),
        }))
      );

      setAccordianContent(newAccordianContent.reduce((acc, curr) => ({ ...acc, ...curr }), {}));
    };

    fetchAccordianContent();
  }, [selectedPromptContexts]);

  if (isEmpty(promptContexts)) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      {selectedPromptContexts.map(({ description, id }) => (
        <EuiFlexItem grow={false} key={id}>
          {isNewConversation || selectedPromptContexts.length > 1 ? <EuiSpacer /> : null}
          <EuiAccordion
            buttonContent={description}
            extraAction={
              <EuiButtonIcon iconType="trash" onClick={() => unselectPromptContext(id)} />
            }
            id={id}
            paddingSize="s"
          >
            <PromptContextText color="subdued">
              {id != null && accordianContent[id] != null
                ? SYSTEM_PROMPT_CONTEXT_NON_I18N(accordianContent[id])
                : ''}
            </PromptContextText>
          </EuiAccordion>
        </EuiFlexItem>
      ))}

      {}
    </EuiFlexGroup>
  );
};

SelectedPromptContextsComponent.displayName = 'SelectedPromptContextsComponent';
export const SelectedPromptContexts = React.memo(SelectedPromptContextsComponent);
