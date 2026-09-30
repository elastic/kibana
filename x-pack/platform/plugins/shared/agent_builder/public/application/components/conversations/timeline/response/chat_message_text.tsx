/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiMarkdownFormat,
  EuiText,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
  useEuiTheme,
} from '@elastic/eui';
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
  renderAttachmentTagParser,
  createRenderAttachmentRenderer,
  renderTagParser,
  createRenderRenderer,
  createConversationMarkdownComponents,
} from './markdown_plugins';
import { markdownContainerStyles } from './markdown_container.styles';
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
  const euiThemeContext = useEuiTheme();

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
      [renderAttachmentElement.tagName]: renderAttachmentRenderer,
      [renderElement.tagName]: renderRenderer,
    };

    return {
      parsingPluginList: [
        loadingCursorPlugin,
        esqlLanguagePlugin,
        visualizationTagParser,
        renderAttachmentTagParser,
        renderTagParser,
        ...parsingPlugins,
      ],
      processingPluginList: processingPlugins,
    };
  }, [visualizationRenderer, renderAttachmentRenderer, renderRenderer, handleLinkClick]);

  return (
    <>
      <EuiText size="s" css={markdownContainerStyles(euiThemeContext)}>
        <EuiMarkdownFormat
          textSize="s"
          parsingPluginList={parsingPluginList}
          processingPluginList={processingPluginList}
        >
          {content}
        </EuiMarkdownFormat>
      </EuiText>
      {externalLinkModal}
    </>
  );
}
