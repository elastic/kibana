/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { isEmpty, omit } from 'lodash/fp';
import React, { useCallback } from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { Conversation } from '../../../assistant_context/types';
import { DataAnonymizationEditor } from '../../../data_anonymization_editor';
import type { PromptContext, SelectedPromptContext } from '../../prompt_context/types';
import * as i18n from './translations';

export interface Props {
  promptContexts: Record<string, PromptContext>;
  selectedPromptContexts: Record<string, SelectedPromptContext>;
  setSelectedPromptContexts: React.Dispatch<
    React.SetStateAction<Record<string, SelectedPromptContext>>
  >;
  currentReplacements: Conversation['replacements'] | undefined;
}

export const EditorContainer = styled.div<{
  $accordionState: 'closed' | 'open';
}>`
  ${({ $accordionState }) => ($accordionState === 'closed' ? 'height: 0px;' : '')}
  ${({ $accordionState }) => ($accordionState === 'closed' ? 'overflow: hidden;' : '')}
  ${({ $accordionState }) => ($accordionState === 'closed' ? 'position: absolute;' : '')}
`;

const SelectedPromptContextsComponent: React.FC<Props> = ({
  promptContexts,
  selectedPromptContexts,
  setSelectedPromptContexts,
  currentReplacements,
}) => {
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
    <EuiFlexGroup data-test-subj="selectedPromptContexts" direction="column" gutterSize={'s'}>
      {Object.keys(selectedPromptContexts)
        .sort()
        .map((id) => (
          <EuiFlexItem data-test-subj={`selectedPromptContext-${id}`} grow={false} key={id}>
            <EuiAccordion
              buttonContent={promptContexts[id]?.description}
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
              css={css`
                background: ${euiThemeVars.euiPageBackgroundColor};
                border-radius: ${euiThemeVars.euiBorderRadius};

                > div:first-child {
                  color: ${euiThemeVars.euiColorPrimary};
                  padding: ${euiThemeVars.euiFormControlPadding};
                }
              `}
              borders={'all'}
              arrowProps={{
                color: 'primary',
              }}
            >
              <DataAnonymizationEditor
                currentReplacements={currentReplacements}
                selectedPromptContext={selectedPromptContexts[id]}
                setSelectedPromptContexts={setSelectedPromptContexts}
              />
            </EuiAccordion>
          </EuiFlexItem>
        ))}
    </EuiFlexGroup>
  );
};

export const SelectedPromptContexts = React.memo(SelectedPromptContextsComponent);
