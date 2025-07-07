/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import classNames from 'classnames';
import type { Code, InlineCode, Parent, Text } from 'mdast';
import React, { useMemo } from 'react';
import type { Node } from 'unist';
import {
  EuiCodeBlock,
  EuiTable,
  EuiTableRow,
  EuiTableRowCell,
  EuiTableHeaderCell,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
} from '@elastic/eui';

interface Props {
  content: string;
}

const cursorCss = css`
  @keyframes blink {
    0% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  animation: blink 1s infinite;
  width: 10px;
  height: 16px;
  vertical-align: middle;
  display: inline-block;
  background: rgba(0, 0, 0, 0.25);
`;

const Cursor = () => <span key="cursor" className={classNames(cursorCss, 'cursor')} />;

const CURSOR = ` ᠎  `;

const loadingCursorPlugin = () => {
  const visitor = (node: Node, parent?: Parent) => {
    if ('children' in node) {
      const nodeAsParent = node as Parent;
      nodeAsParent.children.forEach((child) => {
        visitor(child, nodeAsParent);
      });
    }

    if (node.type !== 'text' && node.type !== 'inlineCode' && node.type !== 'code') {
      return;
    }

    const textNode = node as Text | InlineCode | Code;

    const indexOfCursor = textNode.value.indexOf(CURSOR);
    if (indexOfCursor === -1) {
      return;
    }

    textNode.value = textNode.value.replace(CURSOR, '');

    const indexOfNode = parent!.children.indexOf(textNode);
    parent!.children.splice(indexOfNode + 1, 0, {
      type: 'cursor' as Text['type'],
      value: CURSOR,
    });
  };

  return (tree: Node) => {
    visitor(tree);
  };
};

const esqlLanguagePlugin = () => {
  const visitor = (node: Node, parent?: Parent) => {
    if ('children' in node) {
      const nodeAsParent = node as Parent;
      nodeAsParent.children.forEach((child) => {
        visitor(child, nodeAsParent);
      });
    }

    if (node.type === 'code' && node.lang === 'esql') {
      node.type = 'esql';
    } else if (node.type === 'code') {
      // switch to type that allows us to control rendering
      node.type = 'codeBlock';
    }
  };

  return (tree: Node) => {
    visitor(tree);
  };
};

/**
 * Component handling markdown support to the assistant's responses.
 * Also handles "loading" state by appending the blinking cursor.
 */
export function ChatMessageText({ content }: Props) {
  const containerClassName = css`
    overflow-wrap: anywhere;
  `;

  const { parsingPluginList, processingPluginList } = useMemo(() => {
    const parsingPlugins = getDefaultEuiMarkdownParsingPlugins();
    const processingPlugins = getDefaultEuiMarkdownProcessingPlugins();

    const { components } = processingPlugins[1][1];

    processingPlugins[1][1].components = {
      ...components,
      cursor: Cursor,
      codeBlock: (props) => {
        return (
          <>
            <EuiCodeBlock>{props.value}</EuiCodeBlock>
            <EuiSpacer size="m" />
          </>
        );
      },
      esql: (props) => {
        return (
          <>
            <EuiCodeBlock>{props.value}</EuiCodeBlock>
            <EuiSpacer size="m" />
          </>
        );
      },
      table: (props) => (
        <>
          <EuiTable
            {...props}
            className={css`
              .euiTableCellContent__text {
                white-space: normal;
              }
            `}
          />
          <EuiSpacer size="m" />
        </>
      ),
      th: (props) => {
        const { children, ...rest } = props;
        return <EuiTableHeaderCell {...rest}>{children}</EuiTableHeaderCell>;
      },
      tr: (props) => <EuiTableRow {...props} />,
      td: (props) => {
        const { children, ...rest } = props;
        return (
          <EuiTableRowCell truncateText={true} {...rest}>
            {children}
          </EuiTableRowCell>
        );
      },
    };

    return {
      parsingPluginList: [loadingCursorPlugin, esqlLanguagePlugin, ...parsingPlugins],
      processingPluginList: processingPlugins,
    };
  }, []);

  return (
    <EuiText size="s" className={containerClassName}>
      <EuiMarkdownFormat
        textSize="s"
        parsingPluginList={parsingPluginList}
        processingPluginList={processingPluginList}
      >
        {content}
      </EuiMarkdownFormat>
    </EuiText>
  );
}
