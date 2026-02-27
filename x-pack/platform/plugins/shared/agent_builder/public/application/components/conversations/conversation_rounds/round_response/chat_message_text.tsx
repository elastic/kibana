/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import React, { useMemo, useState, useCallback } from 'react';
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
  EuiLink,
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
} from './markdown_plugins';
import { useStepsFromPrevRounds } from '../../../../hooks/use_conversation';
import { useConversationContext } from '../../../../context/conversation/conversation_context';
import { CanvasProvider } from './attachments/canvas_context';
import { CanvasFlyout } from './attachments/canvas_flyout';
import { ExternalLinkModal } from './external_link_modal';

interface Props {
  content: string;
  steps: ConversationRoundStep[];
  conversationAttachments?: VersionedAttachment[];
  attachmentRefs?: AttachmentVersionRef[];
  conversationId?: string;
}

/**
 * Component handling markdown support to the assistant's responses.
 * Also handles "loading" state by appending the blinking cursor.
 */
export function ChatMessageText({
  content,
  steps: stepsFromCurrentRound,
  conversationAttachments,
  attachmentRefs,
  conversationId,
}: Props) {
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

  const { attachmentsService, startDependencies } = useAgentBuilderServices();
  const stepsFromPrevRounds = useStepsFromPrevRounds();
  const { isEmbeddedContext: isSidebar } = useConversationContext();
  const {
    services: { http, application },
  } = useKibana();

  const [pendingExternalUrl, setPendingExternalUrl] = useState<string | null>(null);

  const handleLinkClick = useCallback(
    (href: string, e: React.MouseEvent) => {
      const internal = http?.externalUrl?.isInternalUrl(href);
      if (!internal) {
        // External links always show the confirmation modal
        e.preventDefault();
        setPendingExternalUrl(href);
      } else if (isSidebar) {
        // Internal link in flyout: navigate in current window
        e.preventDefault();
        application.navigateToUrl(new URL(href, window.location.href).toString());
      }
      // Internal link in full page: target="_blank" handles navigation
    },
    [isSidebar, http?.externalUrl, application]
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
      a: (props) => (
        <EuiLink
          {...props}
          target="_blank"
          rel="noreferrer"
          external={false}
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            if (props.href) handleLinkClick(props.href, e);
          }}
        />
      ),
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
      }),
      [renderAttachmentElement.tagName]: createRenderAttachmentRenderer({
        conversationAttachments,
        attachmentRefs,
        conversationId,
        isSidebar,
        attachmentsService,
      }),
    };

    return {
      parsingPluginList: [
        loadingCursorPlugin,
        esqlLanguagePlugin,
        visualizationTagParser,
        renderAttachmentTagParser,
        ...parsingPlugins,
      ],
      processingPluginList: processingPlugins,
    };
  }, [
    startDependencies,
    stepsFromCurrentRound,
    stepsFromPrevRounds,
    conversationAttachments,
    attachmentRefs,
    conversationId,
    isSidebar,
    attachmentsService,
    handleLinkClick,
  ]);

  return (
    <CanvasProvider>
      <EuiText size="m" className={containerClassName}>
        <EuiMarkdownFormat
          textSize="m"
          parsingPluginList={parsingPluginList}
          processingPluginList={processingPluginList}
        >
          {content}
        </EuiMarkdownFormat>
      </EuiText>
      <CanvasFlyout attachmentsService={attachmentsService} />
      <ExternalLinkModal url={pendingExternalUrl} onClose={() => setPendingExternalUrl(null)} />
    </CanvasProvider>
  );
}
