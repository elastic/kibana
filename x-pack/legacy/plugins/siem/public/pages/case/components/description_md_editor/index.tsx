/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiPanel, EuiTabbedContent, EuiTextArea } from '@elastic/eui';
import React, { useState } from 'react';
import styled from 'styled-components';

import { Markdown } from '../../../../components/markdown';
import * as i18n from '../../translations';
import { MarkdownHint } from '../../../../components/markdown/markdown_hint';
import { CommonUseField } from '../create';

const TextArea = styled(EuiTextArea)<{ height: number }>`
  min-height: ${({ height }) => `${height}px`};
  width: 100%;
`;

TextArea.displayName = 'TextArea';

const DescriptionContainer = styled.div`
  margin-top: 15px;
  margin-bottom: 15px;
`;

const DescriptionMarkdownTabs = styled(EuiTabbedContent)`
  width: 100%;
`;

DescriptionMarkdownTabs.displayName = 'DescriptionMarkdownTabs';

const MarkdownContainer = styled(EuiPanel)<{ height: number }>`
  height: ${({ height }) => height}px;
  overflow: auto;
`;

MarkdownContainer.displayName = 'MarkdownContainer';

/** An input for entering a new case description  */
export const DescriptionMarkdown = React.memo<{
  descriptionInputHeight: number;
  initialDescription: string;
  isLoading: boolean;
  formHook?: boolean;
  onChange: (description: string) => void;
}>(({ initialDescription, isLoading, descriptionInputHeight, onChange, formHook = false }) => {
  const [description, setDescription] = useState(initialDescription);
  const tabs = [
    {
      id: 'description',
      name: i18n.DESCRIPTION,
      content: formHook ? (
        <CommonUseField
          path="description"
          onChange={e => {
            setDescription(e as string);
            onChange(e as string);
          }}
          componentProps={{
            idAria: 'caseDescription',
            'data-test-subj': 'caseDescription',
            isDisabled: isLoading,
            spellcheck: false,
          }}
        />
      ) : (
        <TextArea
          onChange={e => {
            setDescription(e.target.value);
            onChange(e.target.value);
          }}
          fullWidth={true}
          height={descriptionInputHeight}
          aria-label={i18n.DESCRIPTION}
          disabled={isLoading}
          spellCheck={false}
          value={description}
        />
      ),
    },
    {
      id: 'preview',
      name: i18n.PREVIEW,
      content: (
        <MarkdownContainer
          data-test-subj="markdown-container"
          height={descriptionInputHeight}
          paddingSize="s"
        >
          <Markdown raw={description} />
        </MarkdownContainer>
      ),
    },
  ];
  return (
    <DescriptionContainer>
      <DescriptionMarkdownTabs
        data-test-subj="new-description-tabs"
        tabs={tabs}
        initialSelectedTab={tabs[0]}
      />
      <EuiFlexItem grow={true}>
        <MarkdownHint show={description.trim().length > 0} />
      </EuiFlexItem>
    </DescriptionContainer>
  );
});

DescriptionMarkdown.displayName = 'DescriptionMarkdown';
