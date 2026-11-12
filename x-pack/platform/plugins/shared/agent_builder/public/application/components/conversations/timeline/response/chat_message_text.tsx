/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import {
  EuiMarkdownFormat,
  EuiText,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
  useEuiTheme,
} from '@elastic/eui';
import { splitAuthoredMarkdown } from '@elastic/isomer-sdk/markdown';
import { type PluggableList } from 'unified';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import type {
  VersionedAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import {
  visualizationElement,
  renderAttachmentElement,
  renderElement,
} from '@kbn/agent-builder-common/tools/custom_rendering';
import { useAgentBuilderServices } from '../../../../hooks/use_agent_builder_service';
import { useKibana } from '../../../../hooks/use_kibana';
import {
  Cursor,
  esqlLanguagePlugin,
  createVisualizationRenderer,
  loadingCursorPlugin,
  visualizationTagParser,
  createRenderAttachmentRenderer,
  renderTagParser,
  createRenderRenderer,
  createConversationMarkdownComponents,
} from './markdown_plugins';
import { useMarkdownContainerStyles } from './use_markdown_container_styles';
import { useStepsFromSavedTurns } from '../../../../hooks/use_steps_from_saved_turns';
import { useConversationContext } from '../../../../context/conversation/conversation_context';
import { useMarkdownLinkClick } from './use_markdown_link_click';

interface Props {
  content: string;
  steps: ConversationRoundStep[];
  conversationAttachments?: VersionedAttachment[];
  attachmentRefs?: AttachmentVersionRef[];
  conversationId?: string;
  isStreaming?: boolean;
}

const { tagName, attributes } = renderAttachmentElement;

/** A closed tag. An unfinished tag at the end of a stream stays in the markdown. */
const COMPLETE_RENDER_ATTACHMENT_TAG = new RegExp(`<${tagName}\\b[^>]*\\/?>`, 'i');

/**
 * Component handling markdown support to the assistant's responses.
 * Also handles "loading" state by appending the blinking cursor.
 */
export function ChatMessageText({
  content,
  steps: stepsFromCurrentTurn,
  conversationAttachments,
  attachmentRefs,
  conversationId,
  isStreaming = false,
}: Props) {
  const { euiTheme } = useEuiTheme();
  const markdownContainerStyles = useMarkdownContainerStyles();
  const splitMessageStyles = useMemo(
    () => css`
      display: flex;
      flex-direction: column;
      gap: ${euiTheme.size.s};
    `,
    [euiTheme.size.s]
  );

  const { attachmentsService, renderersService, conversationsService, startDependencies } =
    useAgentBuilderServices();
  const stepsFromPreviousTurns = useStepsFromSavedTurns();
  const { isEmbeddedContext: isSidebar } = useConversationContext();
  const {
    services: { http, application, uiSettings },
  } = useKibana();

  const { handleLinkClick, externalLinkModal } = useMarkdownLinkClick();

  const visualizationRenderer = useMemo(
    () =>
      createVisualizationRenderer({
        application,
        http,
        uiSettings,
        startDependencies,
        stepsFromCurrentTurn,
        stepsFromPreviousTurns,
      }),
    [application, http, uiSettings, startDependencies, stepsFromCurrentTurn, stepsFromPreviousTurns]
  );

  const renderAttachmentRenderer = useMemo(
    () =>
      createRenderAttachmentRenderer({
        conversationAttachments,
        attachmentRefs,
        conversationId,
        isSidebar,
        attachmentsService,
        isStreaming,
      }),
    [
      conversationAttachments,
      attachmentRefs,
      conversationId,
      isSidebar,
      attachmentsService,
      isStreaming,
    ]
  );

  const renderRenderer = useMemo(
    () =>
      createRenderRenderer({
        renderersService,
        conversationsService,
        conversationId,
        isStreaming,
      }),
    [renderersService, conversationsService, conversationId, isStreaming]
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
      ...createConversationMarkdownComponents({ onLinkClick: handleLinkClick }),
      cursor: Cursor,
      [visualizationElement.tagName]: visualizationRenderer,
      [renderElement.tagName]: renderRenderer,
    };

    return {
      parsingPluginList: [
        loadingCursorPlugin,
        esqlLanguagePlugin,
        visualizationTagParser,
        renderTagParser,
        ...parsingPlugins,
      ],
      processingPluginList: processingPlugins,
    };
  }, [visualizationRenderer, renderRenderer, handleLinkClick]);

  // Skip the splitter until a closed tag appears. A tag it leaves in code stays in the
  // original string, so that reply is not reprinted.
  const messageSegments = useMemo(() => {
    if (!COMPLETE_RENDER_ATTACHMENT_TAG.test(content)) {
      return undefined;
    }
    const segments = splitAuthoredMarkdown(content, { elements: [tagName] });
    return segments.some((segment) => segment.type === 'element') ? segments : undefined;
  }, [content]);

  const markdownMessage = (source: string, key: string) => (
    <EuiText key={key} size="s" css={markdownContainerStyles}>
      <EuiMarkdownFormat
        textSize="s"
        parsingPluginList={parsingPluginList}
        processingPluginList={processingPluginList}
      >
        {source}
      </EuiMarkdownFormat>
    </EuiText>
  );

  // The column is always present, and markdown blocks are numbered on their own, so the
  // first prose block keeps the key `markdown-0` when the first attachment tag arrives.
  const messageChildren: React.ReactNode[] = [];
  let markdownIndex = 0;
  let attachmentIndex = 0;
  for (const segment of messageSegments ?? [{ type: 'markdown' as const, source: content }]) {
    if (segment.type === 'markdown') {
      messageChildren.push(markdownMessage(segment.source, `markdown-${markdownIndex}`));
      markdownIndex += 1;
    } else {
      messageChildren.push(
        React.createElement(renderAttachmentRenderer, {
          key: `attachment-${attachmentIndex}`,
          attachmentId: segment.attributes[attributes.attachmentId],
          version: segment.attributes[attributes.version],
        })
      );
      attachmentIndex += 1;
    }
  }

  return (
    <>
      <div css={splitMessageStyles}>{messageChildren}</div>
      {externalLinkModal}
    </>
  );
}
