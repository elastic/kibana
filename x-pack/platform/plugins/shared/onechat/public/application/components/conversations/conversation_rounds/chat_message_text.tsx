/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import React, { useMemo } from 'react';
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
import { type PluggableList } from 'unified';
import type { ConversationRoundStep } from '@kbn/onechat-common';
import type { ContentReferences } from '@kbn/onechat-common/chat/conversation';
import { useOnechatServices } from '../../../hooks/use_onechat_service';
import {
  Cursor,
  esqlLanguagePlugin,
  getVisualizationHandler,
  loadingCursorPlugin,
  visualizationPlugin,
} from './markdown_plugins';
import { useStepsFromPrevRounds } from '../../../hooks/use_conversation';
import { contentReferenceParser } from '../content_reference/content_reference_parser';
import { ContentReferenceComponentFactory } from '../content_reference/components/content_reference_component_factory';

interface Props {
  content: string;
  steps: ConversationRoundStep[];
  contentReferences?: ContentReferences | null;
}

/**
 * Component handling markdown support to the assistant's responses.
 * Also handles "loading" state by appending the blinking cursor.
 */
export function ChatMessageText({
  content,
  steps: stepsFromCurrentRound,
  contentReferences,
}: Props) {
  const containerClassName = css`
    overflow-wrap: anywhere;
  `;

  const { startDependencies } = useOnechatServices();
  const stepsFromPrevRounds = useStepsFromPrevRounds();

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
      visualization: getVisualizationHandler({
        startDependencies,
        stepsFromCurrentRound,
        stepsFromPrevRounds,
      }),
      contentReference: (props: any) => (
        <ContentReferenceComponentFactory contentReferenceNode={props} />
      ),
    };

    return {
      parsingPluginList: [
        loadingCursorPlugin,
        esqlLanguagePlugin,
        visualizationPlugin,
        ...(contentReferences ? [contentReferenceParser({ contentReferences })] : []),
        ...parsingPlugins,
      ],
      processingPluginList: processingPlugins,
    };
  }, [startDependencies, stepsFromCurrentRound, stepsFromPrevRounds, contentReferences]);

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
