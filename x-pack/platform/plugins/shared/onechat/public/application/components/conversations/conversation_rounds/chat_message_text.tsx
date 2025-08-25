/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import classNames from 'classnames';
import React, { useEffect, useMemo, useRef } from 'react';
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
import type { TabularDataResult } from '@kbn/onechat-common/tools/tool_result';
import { ChartType } from '@kbn/visualization-utils';
// import { vizLanguagePlugin } from './markdown_plugins/viz_code_block';
import { type PluggableList } from 'unified';
import type { ConversationRoundStep } from '@kbn/onechat-common';
import { useConversationRounds } from '../../../hooks/use_conversation';
import { VisualizeESQL } from '../../tools/esql/visualize_esql';
import { useOnechatServices } from '../../../hooks/use_onechat_service';
import { esqlLanguagePlugin, loadingCursorPlugin, toolResultPlugin } from './markdown_plugins';

interface Props {
  content: string;
  steps: ConversationRoundStep[];
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

/**
 * Component handling markdown support to the assistant's responses.
 * Also handles "loading" state by appending the blinking cursor.
 */
function ChatMessageText({ content, steps }: Props) {
  const containerClassName = css`
    overflow-wrap: anywhere;
  `;

  // Use a ref to track the render count
  const renderCount = useRef(1);

  // This log will appear on every single render
  console.log(
    `ChatMessageText is RENDERING (render #${renderCount.current}). Content: "${content.substring(
      0,
      30
    )}..."`
  );

  // Increment the render count after each render
  useEffect(() => {
    renderCount.current += 1;
  });

  // const conversationRounds = useConversationRounds();
  const { pluginsStart } = useOnechatServices();

  const { parsingPluginList, processingPluginList } = useMemo(() => {
    const parsingPlugins = getDefaultEuiMarkdownParsingPlugins();
    const defaultProcessingPlugins = getDefaultEuiMarkdownProcessingPlugins();

    const [remarkToRehypePlugin, remarkToRehypeOptions] = defaultProcessingPlugins[0];
    const [rehypeToReactPlugin, rehypeToReactOptions] = defaultProcessingPlugins[1];

    const processingPlugins = [
      [remarkToRehypePlugin, remarkToRehypeOptions],
      [rehypeToReactPlugin, rehypeToReactOptions],
    ] as PluggableList;

    rehypeToReactOptions.components = {
      ...rehypeToReactOptions.components,
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
      toolresult: (props) => {
        const { resultId, chartType } = props;

        if (!resultId) {
          return <p>Visualization requires a tool result ID.</p>;
        }

        const toolResult = steps
          .filter((s) => s.type === 'tool_call')
          .flatMap((s) => (s.type === 'tool_call' && s.results) || [])
          .find((r) => r.ui?.toolResultId === resultId && r.type === 'tabular_data') as
          | TabularDataResult
          | undefined;

        if (!toolResult) {
          return <p>Unable to find visualization for tool result ID: {resultId}</p>;
        }

        const { esqlQuery, esqlResult } = toolResult.data;

        return (
          <VisualizeESQL
            lens={pluginsStart.lens}
            dataViews={pluginsStart.dataViews}
            uiActions={pluginsStart.uiActions}
            esqlQuery={esqlQuery}
            esqlResult={esqlResult}
            preferredChartType={(chartType as ChartType | undefined) || ChartType.Line}
          />
        );
      },
    };

    return {
      parsingPluginList: [
        loadingCursorPlugin,
        esqlLanguagePlugin,
        toolResultPlugin,
        ...parsingPlugins,
      ],
      processingPluginList: processingPlugins,
    };
  }, [pluginsStart.dataViews, pluginsStart.lens, pluginsStart.uiActions, steps]);

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

export const MemoizedChatMessageText = React.memo(ChatMessageText);
