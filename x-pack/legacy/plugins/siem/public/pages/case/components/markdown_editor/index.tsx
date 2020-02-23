/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiTabbedContent,
  EuiTextArea,
} from '@elastic/eui';
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

const Footer = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    height: 41px;
    padding: 0 ${theme.eui.euiSizeM};
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
  fieldName: 'comment' | 'description';
  footerContentRight?: React.ReactNode;
  formHook?: boolean;
  initialContent: string;
  isLoading: boolean;
  onChange: (description: string) => void;
}>(({ fieldName, footerContentRight, formHook = false, initialContent, isLoading, onChange }) => {
  const [content, setContent] = useState(initialContent);
  const tabs = [
    {
      id: fieldName,
      name: i18n.MARKDOWN,
      content: formHook ? (
        <CommonUseField
          path={fieldName}
          onChange={e => {
            setContent(e as string);
            onChange(e as string);
          }}
          componentProps={{
            idAria: `case${fieldName}`,
            'data-test-subj': `case${fieldName}`,
            isDisabled: isLoading,
            spellcheck: false,
            placeholder: 'Add a placeholder...',
          }}
        />
      ) : (
        <TextArea
          onChange={e => {
            setContent(e.target.value);
            onChange(e.target.value);
          }}
          fullWidth={true}
          aria-label={`case${fieldName}`}
          disabled={isLoading}
          spellCheck={false}
          value={content}
        />
      ),
    },
    {
      id: 'preview',
      name: i18n.PREVIEW,
      content: (
        <MarkdownContainer data-test-subj="markdown-container" paddingSize="s">
          <Markdown raw={content} />
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
      <Footer alignItems="center" gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiLink href="https://www.markdownguide.org/cheat-sheet/" external target="_blank">
            {i18n.MARKDOWN_SYNTAX_HELP}
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{footerContentRight && footerContentRight}</EuiFlexItem>
      </Footer>
    </Container>
  );
});

MarkdownEditor.displayName = 'MarkdownEditor';
