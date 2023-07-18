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
  EuiToolTip,
} from '@elastic/eui';
import { isEmpty, omit } from 'lodash/fp';
import React, { useCallback } from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import { DataAnonymizationEditor } from '../../../data_anonymization_editor';
import type { PromptContext, SelectedPromptContext } from '../../prompt_context/types';
import * as i18n from './translations';

export interface Props {
  isNewConversation: boolean;
  promptContexts: Record<string, PromptContext>;
  selectedPromptContexts: Record<string, SelectedPromptContext>;
  setSelectedPromptContexts: React.Dispatch<
    React.SetStateAction<Record<string, SelectedPromptContext>>
  >;
}

export const EditorContainer = styled.div<{
  $accordionState: 'closed' | 'open';
}>`
  ${({ $accordionState }) => ($accordionState === 'closed' ? 'height: 0px;' : '')}
  ${({ $accordionState }) => ($accordionState === 'closed' ? 'overflow: hidden;' : '')}
  ${({ $accordionState }) => ($accordionState === 'closed' ? 'position: absolute;' : '')}
`;

const SelectedPromptContextsComponent: React.FC<Props> = ({
  isNewConversation,
  promptContexts,
  selectedPromptContexts,
  setSelectedPromptContexts,
}) => {
  const [accordionState, setAccordionState] = React.useState<'closed' | 'open'>('closed');

  const onToggle = useCallback(
    () => setAccordionState((prev) => (prev === 'open' ? 'closed' : 'open')),
    []
  );

  const unselectPromptContext = useCallback(
    (unselectedId: string) => {
      setSelectedPromptContexts((prev) => omit(unselectedId, prev));
    },
    [setSelectedPromptContexts]
  );

  if (isEmpty(promptContexts)) {
    return null;
  }

  return (
    <EuiFlexGroup data-test-subj="selectedPromptContexts" direction="column" gutterSize="none">
      {Object.keys(selectedPromptContexts)
        .sort()
        .map((id) => (
          <EuiFlexItem data-test-subj={`selectedPromptContext-${id}`} grow={false} key={id}>
            {isNewConversation || Object.keys(selectedPromptContexts).length > 1 ? (
              <EuiSpacer data-test-subj="spacer" />
            ) : null}
            <EuiAccordion
              buttonContent={promptContexts[id]?.description}
              forceState={accordionState}
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
              onToggle={onToggle}
              paddingSize="s"
            >
              <EditorContainer $accordionState={accordionState}>
                <DataAnonymizationEditor
                  selectedPromptContext={selectedPromptContexts[id]}
                  setSelectedPromptContexts={setSelectedPromptContexts}
                />
              </EditorContainer>
            </EuiAccordion>
          </EuiFlexItem>
        ))}
    </EuiFlexGroup>
  );
};

export const SelectedPromptContexts = React.memo(SelectedPromptContextsComponent);
