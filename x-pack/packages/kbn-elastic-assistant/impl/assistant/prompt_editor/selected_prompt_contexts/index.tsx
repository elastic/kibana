/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import { SYSTEM_PROMPT_CONTEXT_NON_I18N } from '../../../content/prompts/system/translations';
import type { PromptContext } from '../../prompt_context/types';
import * as i18n from './translations';

const PromptContextContainer = styled.div`
  max-width: 60vw;
  overflow-x: auto;
`;

export interface Props {
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

  const [accordionContent, setAccordionContent] = useState<Record<string, string>>({});

  const unselectPromptContext = useCallback(
    (unselectedId: string) => {
      setSelectedPromptContextIds((prev) => prev.filter((id) => id !== unselectedId));
    },
    [setSelectedPromptContextIds]
  );

  useEffect(() => {
    const fetchAccordionContent = async () => {
      const newAccordionContent = await Promise.all(
        selectedPromptContexts.map(async ({ getPromptContext, id }) => ({
          [id]: await getPromptContext(),
        }))
      );

      setAccordionContent(newAccordionContent.reduce((acc, curr) => ({ ...acc, ...curr }), {}));
    };

    fetchAccordionContent();
  }, [selectedPromptContexts]);

  if (isEmpty(promptContexts)) {
    return null;
  }

  return (
    <EuiFlexGroup data-test-subj="selectedPromptContexts" direction="column" gutterSize="none">
      {selectedPromptContexts.map(({ description, id }) => (
        <EuiFlexItem data-test-subj={`selectedPromptContext-${id}`} grow={false} key={id}>
          {isNewConversation || selectedPromptContexts.length > 1 ? (
            <EuiSpacer data-test-subj="spacer" />
          ) : null}
          <EuiAccordion
            buttonContent={description}
            extraAction={
              <EuiToolTip content={i18n.REMOVE_CONTEXT}>
                <EuiButtonIcon
                  aria-label={i18n.REMOVE_CONTEXT}
                  data-test-subj={`removePromptContext-${id}`}
                  iconType="cross"
                  onClick={() => unselectPromptContext(id)}
                />
              </EuiToolTip>
            }
            id={id}
            paddingSize="s"
          >
            <PromptContextContainer>
              <EuiCodeBlock data-test-subj="promptCodeBlock" isCopyable>
                {id != null && accordionContent[id] != null
                  ? SYSTEM_PROMPT_CONTEXT_NON_I18N(accordionContent[id])
                  : ''}
              </EuiCodeBlock>
            </PromptContextContainer>
          </EuiAccordion>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

SelectedPromptContextsComponent.displayName = 'SelectedPromptContextsComponent';
export const SelectedPromptContexts = React.memo(SelectedPromptContextsComponent);
