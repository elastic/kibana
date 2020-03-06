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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';

import { Markdown } from '../markdown';
import * as i18n from './translations';
import { MARKDOWN_HELP_LINK } from './constants';

const TextArea = styled(EuiTextArea)`
  width: 100%;
`;

const Container = styled(EuiPanel)`
  ${({ theme }) => css`
    padding: 0;
    background: ${theme.eui.euiColorLightestShade};
    position: relative;
    .markdown-tabs-header {
      position: absolute;
      top: ${theme.eui.euiSizeS};
      right: ${theme.eui.euiSizeS};
      z-index: ${theme.eui.euiZContentMenu};
    }
    .euiTab {
      padding: 10px;
    }
    .markdown-tabs {
      width: 100%;
    }
    .markdown-tabs-footer {
      height: 41px;
      padding: 0 ${theme.eui.euiSizeM};
      .euiLink {
        font-size: ${theme.eui.euiSizeM};
      }
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

const MarkdownContainer = styled(EuiPanel)`
  min-height: 150px;
  overflow: auto;
`;

export interface CursorPosition {
  start: number;
  end: number;
}

/** An input for entering a new case description  */
export const MarkdownEditor = React.memo<{
  bottomRightContent?: React.ReactNode;
  topRightContent?: React.ReactNode;
  initialContent: string;
  isDisabled?: boolean;
  onChange: (description: string) => void;
  onCursorPositionUpdate?: (cursorPosition: CursorPosition) => void;
  placeholder?: string;
}>(
  ({
    bottomRightContent,
    topRightContent,
    initialContent,
    isDisabled = false,
    onChange,
    placeholder,
    onCursorPositionUpdate,
  }) => {
    const [content, setContent] = useState(initialContent);
    useEffect(() => {
      onChange(content);
    }, [content]);
    const setCursorPosition = useCallback((cursorPosition: CursorPosition) => {
      if (onCursorPositionUpdate) {
        onCursorPositionUpdate(cursorPosition);
      }
    }, []);

    useEffect(() => {
      setContent(initialContent);
    }, [initialContent]);

    const tabs = useMemo(
      () => [
        {
          id: 'comment',
          name: i18n.MARKDOWN,
          content: (
            <TextArea
              onChange={e => {
                setContent(e.target.value);
              }}
              inputRef={x => {
                if (x != null) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  x.addEventListener('blur', (e: any) => {
                    setCursorPosition({
                      start: e.target.selectionStart,
                      end: e.target.selectionEnd,
                    });
                  });
                }
              }}
              aria-label={`markdown-editor-comment`}
              fullWidth={true}
              disabled={isDisabled}
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
      [content, isDisabled, placeholder]
    );
    return (
      <Container>
        {topRightContent && <div className={`markdown-tabs-header`}>{topRightContent}</div>}
        <EuiTabbedContent
          className={`markdown-tabs`}
          data-test-subj={`markdown-tabs`}
          size="s"
          tabs={tabs}
          initialSelectedTab={tabs[0]}
        />
        <EuiFlexGroup
          className={`markdown-tabs-footer`}
          alignItems="center"
          gutterSize="none"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false}>
            <EuiLink href={MARKDOWN_HELP_LINK} external target="_blank">
              {i18n.MARKDOWN_SYNTAX_HELP}
            </EuiLink>
          </EuiFlexItem>
          {bottomRightContent && <EuiFlexItem grow={false}>{bottomRightContent}</EuiFlexItem>}
        </EuiFlexGroup>
      </Container>
    );
  }
);

MarkdownEditor.displayName = 'MarkdownEditor';
