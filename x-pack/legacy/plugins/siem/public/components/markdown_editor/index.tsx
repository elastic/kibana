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
import React, { useEffect, useMemo, useState } from 'react';
import styled, { css } from 'styled-components';

import { Markdown } from '../markdown';
import * as i18n from './translations';
import { Field, getUseField } from '../../shared_imports';
import { MARKDOWN_HELP_LINK } from './constants';

const CommonUseField = getUseField({ component: Field });

const TextArea = styled(EuiTextArea)`
  width: 100%;
`;

const Container = styled(EuiPanel)`
  ${({ theme }) => css`
    padding: 0;
    background: ${theme.eui.euiColorLightestShade};
    position: relative;
    .euiTab {
      padding: 10px;
    }
    .euiFormRow__labelWrapper {
      position: absolute;
      top: -${theme.eui.euiSizeL};
    }
    .euiFormErrorText {
      padding: 0 ${theme.eui.euiSizeM};
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
  placeholder?: string;
  footerContentRight?: React.ReactNode;
  formHook?: boolean;
  initialContent: string;
  onChange: (description: string) => void;
}>(({ fieldName, placeholder, footerContentRight, formHook = false, initialContent, onChange }) => {
  const [content, setContent] = useState(initialContent);
  useEffect(() => {
    onChange(content);
  }, [content]);
  const tabs = useMemo(
    () => [
      {
        id: fieldName,
        name: i18n.MARKDOWN,
        content: formHook ? (
          <CommonUseField
            path={fieldName}
            onChange={e => setContent(e as string)}
            componentProps={{
              idAria: `case${fieldName}`,
              'data-test-subj': `case${fieldName}`,
              spellcheck: false,
              euiFieldProps: { placeholder: placeholder ?? '' },
            }}
          />
        ) : (
          <TextArea
            onChange={e => {
              setContent(e.target.value);
            }}
            aria-label={`case${fieldName}`}
            fullWidth={true}
            placeholder={placeholder ?? ''}
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
    ],
    [content, fieldName, placeholder]
  );
  return (
    <Container>
      <Tabs
        data-test-subj={`new-${fieldName}-tabs`}
        size="s"
        tabs={tabs}
        initialSelectedTab={tabs[0]}
      />
      <Footer alignItems="center" gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiLink href={MARKDOWN_HELP_LINK} external target="_blank">
            {i18n.MARKDOWN_SYNTAX_HELP}
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{footerContentRight && footerContentRight}</EuiFlexItem>
      </Footer>
    </Container>
  );
});

MarkdownEditor.displayName = 'MarkdownEditor';
