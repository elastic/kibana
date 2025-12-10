/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import React, { useMemo, useCallback } from 'react';
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
  useEuiTheme,
} from '@elastic/eui';
import { type PluggableList } from 'unified';
import type { ConversationRoundStep } from '@kbn/onechat-common';
import { AttachmentType, type VersionedAttachment } from '@kbn/onechat-common/attachments';
import { getLatestVersion } from '@kbn/onechat-common/attachments';
import { visualizationElement } from '@kbn/onechat-common/tools/tool_result';
import { useQueryClient } from '@kbn/react-query';
import { useOnechatServices } from '../../../../hooks/use_onechat_service';
import {
  Cursor,
  esqlLanguagePlugin,
  createVisualizationRenderer,
  loadingCursorPlugin,
  visualizationTagParser,
} from './markdown_plugins';
import { useStepsFromPrevRounds, useConversationAttachments } from '../../../../hooks/use_conversation';
import { useConversationId } from '../../../../context/conversation/use_conversation_id';
import { queryKeys } from '../../../../query_keys';
import { useAttachmentViewer } from '../../../../hooks/use_attachment_viewer';

interface Props {
  content: string;
  steps: ConversationRoundStep[];
}

/**
 * Component handling markdown support to the assistant's responses.
 * Also handles "loading" state by appending the blinking cursor.
 */
export function ChatMessageText({ content, steps: stepsFromCurrentRound }: Props) {
  const { euiTheme } = useEuiTheme();

  const containerClassName = css`
    overflow-wrap: anywhere;

    /* Standardize spacing between numbered list items */
    ol > li:not(:first-child) {
      margin-top: ${euiTheme.size.s};
    }

    ol > li > p {
      margin-bottom: ${euiTheme.size.s};
    }
  `;

  const { startDependencies, conversationsService } = useOnechatServices();
  const stepsFromPrevRounds = useStepsFromPrevRounds();
  const conversationId = useConversationId();
  const queryClient = useQueryClient();
  const attachments = useConversationAttachments();

  // Hook to open attachment viewer
  const { openViewer } = useAttachmentViewer({
    attachments,
  });

  // Find an existing visualization attachment that matches the given lensConfig
  const findExistingVisualizationAttachment = useCallback(
    (lensConfig: any): VersionedAttachment | undefined => {
      if (!attachments) return undefined;

      // Look for visualization attachments
      return attachments.find((attachment) => {
        if (attachment.type !== AttachmentType.visualization) return false;

        const latestVersion = getLatestVersion(attachment);
        if (!latestVersion || latestVersion.status !== 'active') return false;

        // Compare the visualization config
        const attachmentData = latestVersion.data as { visualization?: any };
        if (!attachmentData?.visualization) return false;

        // Simple deep comparison using JSON stringify
        // This works for most cases but could be improved with a proper deep equality check
        try {
          return JSON.stringify(attachmentData.visualization) === JSON.stringify(lensConfig);
        } catch {
          return false;
        }
      });
    },
    [attachments]
  );

  // Callback to promote a visualization to a conversation attachment
  const handlePromoteToAttachment = useCallback(
    async (lensConfig: any, esqlQuery?: string) => {
      if (!conversationId) {
        // eslint-disable-next-line no-console
        console.warn('Cannot promote to attachment: no conversation ID');
        return;
      }

      try {
        await conversationsService.createAttachment({
          conversationId,
          type: AttachmentType.visualization,
          data: {
            visualization: lensConfig,
            esql: esqlQuery,
          },
          description: 'Visualization from chat',
        });

        // Invalidate the conversation query to refresh attachments
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byId(conversationId) });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to create visualization attachment:', error);
      }
    },
    [conversationId, conversationsService, queryClient]
  );

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
            <EuiCodeBlock language="esql" isCopyable>
              {props.value}
            </EuiCodeBlock>
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
      [visualizationElement.tagName]: createVisualizationRenderer({
        startDependencies,
        stepsFromCurrentRound,
        stepsFromPrevRounds,
        onPromoteToAttachment: conversationId ? handlePromoteToAttachment : undefined,
        findExistingVisualizationAttachment,
        onOpenAttachment: openViewer,
      }),
    };

    return {
      parsingPluginList: [
        loadingCursorPlugin,
        esqlLanguagePlugin,
        visualizationTagParser,
        ...parsingPlugins,
      ],
      processingPluginList: processingPlugins,
    };
  }, [
    startDependencies,
    stepsFromCurrentRound,
    stepsFromPrevRounds,
    conversationId,
    handlePromoteToAttachment,
    findExistingVisualizationAttachment,
    openViewer,
  ]);

  return (
    <EuiText size="m" className={containerClassName}>
      <EuiMarkdownFormat
        textSize="m"
        parsingPluginList={parsingPluginList}
        processingPluginList={processingPluginList}
      >
        {content}
      </EuiMarkdownFormat>
    </EuiText>
  );
}
