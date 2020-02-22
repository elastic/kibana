/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiPanel, EuiTabbedContent, EuiTextArea } from '@elastic/eui';
import React, { useState } from 'react';
import styled, { css } from 'styled-components';

import { Markdown } from '../../../../components/markdown';
import * as i18n from '../../translations';
import { CommonUseField } from '../create';

const TextArea = styled(EuiTextArea)`
  width: 100%;
  background: green;
`;

const Container = styled(EuiPanel)`
  ${({ theme }) => css`
    margin-top: ${theme.eui.euiSizeM};
    margin-bottom: ${theme.eui.euiSizeM};
    padding: 0;
    background: ${theme.eui.euiColorLightestShade};
    .euiTab {
      padding: 10px;
    }
  `}
`;

const Tabs = styled(EuiTabbedContent)`
  width: 100%;
`;

const Footer = styled.div`
  ${({ theme }) => css`
    padding: ${theme.eui.euiSizeM};
    .euiLink {
      font-size: ${theme.eui.euiSizeM};
    }
  `}
`;

const MarkdownContainer = styled(EuiPanel)`
  min-height: 150px;
  overflow: auto;
`;

/** An input for entering a new case description  */
export const MarkdownEditor = React.memo<{
  initialDescription: string;
  isLoading: boolean;
  fieldName: 'comment' | 'description';
  formHook?: boolean;
  onChange: (description: string) => void;
}>(({ fieldName, initialDescription, isLoading, onChange, formHook = false }) => {
  const [description, setDescription] = useState(initialDescription);
  const tabs = [
    {
      id: fieldName,
      name: i18n.MARKDOWN,
      content: formHook ? (
        <CommonUseField
          path={fieldName}
          onChange={e => {
            setDescription(e as string);
            onChange(e as string);
          }}
          componentProps={{
            idAria: `case${fieldName}`,
            'data-test-subj': `case${fieldName}`,
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
          aria-label={`case${fieldName}`}
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
        <MarkdownContainer data-test-subj="markdown-container" paddingSize="s">
          <Markdown raw={description} />
        </MarkdownContainer>
      ),
    },
  ];
  return (
    <Container>
      <Tabs
        data-test-subj={`new-${fieldName}-tabs`}
        size="s"
        tabs={tabs}
        initialSelectedTab={tabs[0]}
      />
      <Footer>
        <EuiLink href="https://www.markdownguide.org/cheat-sheet/" external target="_blank">
          {i18n.MARKDOWN_SYNTAX_HELP}
        </EuiLink>
      </Footer>
    </Container>
  );
});

MarkdownEditor.displayName = 'MarkdownEditor';
