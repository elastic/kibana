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
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { isEmpty, omit } from 'lodash/fp';
import React, { useCallback } from 'react';
import { css } from '@emotion/react';
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

const SelectedPromptContextsComponent: React.FC<Props> = ({
  promptContexts,
  selectedPromptContexts,
  setSelectedPromptContexts,
  currentReplacements,
}) => {
  const { euiTheme } = useEuiTheme();

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
        .map((id, i) => (
          <EuiFlexItem data-test-subj={`selectedPromptContext-${id}`} grow={false} key={id}>
            <EuiAccordion
              buttonContent={promptContexts[id]?.description}
              buttonProps={{
                'data-test-subj': `selectedPromptContext-${i}-button`,
              }}
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
              // background: ${euiTheme.colors.backgroundPage};
              css={css`
                background: red;
                border-radius: ${euiTheme.border.radius};

                > div:first-child {
                  color: ${euiTheme.colors.primary};
                  padding: ${euiTheme.size.m};
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
