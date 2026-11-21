/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProgress, useEuiTheme } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AggregateQuery, Filter, Query, TimeRange, ProjectRouting } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import React, { useCallback, useEffect, useMemo } from 'react';
import useLatest from 'react-use/lib/useLatest';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import { useCustomContentHtml } from './use_custom_content_html';
import { CustomContentEmptyPrompt } from './custom_content_empty_prompt';
import { CustomContentGeneratingPrompt } from './custom_content_generating_prompt';
import type { CustomContentRendererServices } from './types';
import { CUSTOM_CONTENT_IFRAME_SANDBOX } from './constants';
import {
  readInteraction,
  type CustomContentInteraction,
  type CustomContentInteractionAction,
} from './interactions';

export interface CustomContentComponentProps {
  services: CustomContentRendererServices;
  embeddableId: string;
  /** The panel's queries: the first is `rows` in the template, the others `queries[1]`, `queries[2]`, ... None for a static panel. */
  esqlQueries: readonly string[];
  timeRange: TimeRange | undefined;
  generationVersion: number;
  savedTemplate: string | undefined;
  isApproximate: boolean;
  projectRouting: ProjectRouting | undefined;
  query: Query | AggregateQuery | undefined;
  filters: Filter[] | undefined;
  esqlVariables: ESQLControlVariable[] | undefined;
  previewHtml: string | null;
  /** Whether the host can hand an empty panel over to the agent. Drives the empty prompt's copy. */
  isAiAvailable?: boolean;
  /** True while the agent is generating or updating this panel, to show a generating state. */
  isGenerating?: boolean;
  /** False in a read-only view such as a dashboard preview, where nothing may navigate away. */
  isInteractive?: boolean;
  /**
   * Called when a click on the content asks for an allowlisted action (see `interactions.ts`). When
   * given, this component listens to clicks in the frame, which is same-origin but has no scripts.
   */
  onInteraction?: (interaction: CustomContentInteraction) => void;
  /** The actions this host can run. Leave it out when it runs all of them. */
  interactionActions?: readonly CustomContentInteractionAction[];
  /** Floor for the panel height. Only lower it in a host that gives the panel a definite height. */
  minHeight?: number;
  /** Records the panel's ES|QL request so the host can offer Inspect. */
  requestAdapter?: RequestAdapter;
  onLoadingChange: (isLoading: boolean) => void;
  setApproximationApplied?: (approximationApplied: boolean | undefined) => void;
  onGenerateWithChat?: () => void;
}

const DEFAULT_MIN_HEIGHT = 200;

const iframeContainerCss = (minHeight: number) =>
  css({
    position: 'relative',
    flex: '1 1 0%',
    minHeight,
  });

const iframeCss = css({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  border: 'none',
  background: 'transparent',
});

const IFRAME_TITLE = i18n.translate('xpack.customContent.iframeTitle', {
  defaultMessage: 'Custom panel',
});

export const CustomContentComponent = ({
  services,
  embeddableId,
  esqlQueries,
  timeRange,
  generationVersion,
  savedTemplate,
  isApproximate,
  projectRouting,
  query,
  filters,
  esqlVariables,
  previewHtml,
  isAiAvailable = false,
  isGenerating = false,
  isInteractive = true,
  minHeight = DEFAULT_MIN_HEIGHT,
  requestAdapter,
  onInteraction,
  interactionActions,
  onLoadingChange,
  setApproximationApplied,
  onGenerateWithChat,
}: CustomContentComponentProps) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const { html, columns, isLoading, error, noContent } = useCustomContentHtml({
    services,
    embeddableId,
    esqlQueries,
    timeRange,
    generationVersion,
    savedTemplate,
    colorMode,
    euiTheme,
    isApproximate,
    projectRouting,
    query,
    filters,
    esqlVariables,
    isInteractive,
    requestAdapter,
    setApproximationApplied,
  });

  useEffect(() => onLoadingChange(isLoading), [isLoading, onLoadingChange]);

  const hasInteractions = isInteractive && onInteraction !== undefined;
  // The listener outlives renders, so it reads what is current instead of closing over it.
  const latest = useLatest({ columns, onInteraction, interactionActions });

  // A new srcDoc is a new document, so the listener is attached on every load. It belongs to that
  // document and goes with it, on a reload and when the frame is removed: nothing removes it.
  const attachListener = useCallback(
    (event: React.SyntheticEvent<HTMLIFrameElement>) => {
      if (!hasInteractions) return;

      const frameDocument = event.currentTarget.contentDocument;
      if (!frameDocument) return;
      const onClick = (clickEvent: Event) => {
        if (!clickEvent.isTrusted) return;
        const interaction = readInteraction(
          clickEvent.target,
          latest.current.columns,
          latest.current.interactionActions
        );
        if (interaction) latest.current.onInteraction?.(interaction);
      };
      // Through the prototype, so nothing in the frame can replace the method (DOM clobbering).
      EventTarget.prototype.addEventListener.call(frameDocument, 'click', onClick);
    },
    [hasInteractions, latest]
  );

  const wrapperCss = useMemo(
    () =>
      css({
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 100%',
        minHeight,
        background: euiTheme.colors.emptyShade,
      }),
    [euiTheme.colors.emptyShade, minHeight]
  );

  const containerCss = useMemo(() => iframeContainerCss(minHeight), [minHeight]);

  return (
    <div css={wrapperCss} data-shared-item data-test-subj="customContentPanel">
      {error && (
        <KbnDangerCallout
          title={i18n.translate('xpack.customContent.error.title', {
            defaultMessage: 'Failed to render panel',
          })}
          style={{ margin: euiTheme.size.base }}
          announceOnMount
        >
          {error}
        </KbnDangerCallout>
      )}
      {!error && !isGenerating && noContent && !isLoading && previewHtml == null && (
        <CustomContentEmptyPrompt
          isAiAvailable={isAiAvailable}
          onGenerateWithChat={onGenerateWithChat}
        />
      )}
      {previewHtml != null ? (
        <div css={containerCss}>
          <iframe css={iframeCss} srcDoc={previewHtml} sandbox="" title={IFRAME_TITLE} />
        </div>
      ) : (
        !error &&
        !noContent &&
        html && (
          <div css={containerCss}>
            <iframe
              css={iframeCss}
              srcDoc={html}
              sandbox={isInteractive ? CUSTOM_CONTENT_IFRAME_SANDBOX : ''}
              onLoad={attachListener}
              title={IFRAME_TITLE}
            />
          </div>
        )
      )}
      {isGenerating && <CustomContentGeneratingPrompt />}
      {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
    </div>
  );
};
