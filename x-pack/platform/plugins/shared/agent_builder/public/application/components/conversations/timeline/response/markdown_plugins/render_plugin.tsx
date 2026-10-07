/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useQuery } from '@kbn/react-query';
import { EuiCallOut, EuiErrorBoundary, EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { RendererUIDefinition } from '@kbn/agent-builder-browser';
import { renderElement } from '@kbn/agent-builder-common/tools/custom_rendering';
import type { RenderersService, ConversationsService } from '../../../../../../services';
import { queryKeys } from '../../../../../query_keys';
import { createTagParser } from './utils';

/**
 * Parser for <render> tags in markdown.
 * Converts HTML/text nodes containing render tags into structured AST nodes
 * carrying the workspace `path` and renderer `type`.
 */
export const renderTagParser = createTagParser({
  tagName: renderElement.tagName,
  getAttributes: (value, extractAttr) => ({
    path: extractAttr(value, renderElement.attributes.path),
    type: extractAttr(value, renderElement.attributes.type),
  }),
  createNode: (attributes, position) => ({
    type: renderElement.tagName,
    path: attributes.path,
    renderType: attributes.type,
    position,
  }),
});

interface RenderRendererDeps {
  renderersService: RenderersService;
  conversationsService: ConversationsService;
  conversationId?: string;
  isStreaming: boolean;
}

/** Props derived from the `render` AST node (see `createNode` above). */
interface RenderNodeProps {
  path?: string;
  renderType?: string;
}

const RenderError: React.FC<{ title: string; children?: React.ReactNode }> = ({
  title,
  children,
}) => (
  <EuiCallOut color="danger" size="s" iconType="warning" title={title}>
    {children}
  </EuiCallOut>
);

/**
 * Invokes the plugin-owned render function during THIS component's render, so a
 * throw happens inside the enclosing error boundary's subtree and is contained
 * (calling it inline while building the boundary's children would escape it).
 */
const RendererOutput: React.FC<{
  definition: RendererUIDefinition;
  payload: Record<string, unknown>;
}> = ({ definition, payload }) => <>{definition.render(payload, { isCanvas: false })}</>;

/**
 * Resolves a `<render>` directive once its workspace file is available.
 */
const ResolvedRender: React.FC<{
  path: string;
  renderType: string;
  conversationId: string;
  renderersService: RenderersService;
  conversationsService: ConversationsService;
}> = ({ path, renderType, conversationId, renderersService, conversationsService }) => {
  const { isLoading, error, data } = useQuery({
    queryKey: queryKeys.workspaceFiles.byPath(conversationId, path),
    queryFn: () => conversationsService.readWorkspaceFile({ conversationId, path }),
    retry: (failureCount, httpError: IHttpFetchError) =>
      httpError?.response?.status === 404 && failureCount < 3,
    retryDelay: 1000,
    staleTime: Infinity,
  });

  if (isLoading) {
    return <EuiSkeletonText lines={3} />;
  }

  if (error || !data) {
    return (
      <RenderError
        title={i18n.translate('xpack.agentBuilder.render.loadError', {
          defaultMessage: 'Unable to load render from {path}',
          values: { path },
        })}
      />
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(data.content);
  } catch {
    return (
      <RenderError
        title={i18n.translate('xpack.agentBuilder.render.invalidJson', {
          defaultMessage: 'Render file is not valid JSON',
        })}
      />
    );
  }

  const definition = renderersService.getRendererUiDefinition(renderType);
  if (!definition) {
    return (
      <RenderError
        title={i18n.translate('xpack.agentBuilder.render.unknownType', {
          defaultMessage: 'No renderer registered for type "{type}"',
          values: { type: renderType },
        })}
      />
    );
  }

  const payloadResult = definition.payloadSchema.safeParse(parsedJson);
  if (!payloadResult.success) {
    return (
      <RenderError
        title={i18n.translate('xpack.agentBuilder.render.invalidPayload', {
          defaultMessage: 'Render payload is invalid for type "{type}"',
          values: { type: renderType },
        })}
      >
        {payloadResult.error.issues.map((issue, index) => (
          <div key={`${issue.path.join('.')}-${index}`}>{issue.message}</div>
        ))}
      </RenderError>
    );
  }

  // Renderers are plugin-owned code; contain their render failures so a
  // throwing renderer can't take down the whole chat.
  return (
    <EuiErrorBoundary>
      <RendererOutput definition={definition} payload={payloadResult.data} />
    </EuiErrorBoundary>
  );
};

/**
 * Factory for the `<render>` renderer, mirroring `createRenderAttachmentRenderer`.
 */
export const createRenderRenderer = ({
  renderersService,
  conversationsService,
  conversationId,
  isStreaming,
}: RenderRendererDeps) => {
  return (props: RenderNodeProps) => {
    const { path, renderType } = props;

    if (!path || !conversationId) {
      return null;
    }

    if (isStreaming) {
      return <EuiSkeletonText lines={3} />;
    }

    if (!renderType) {
      return (
        <RenderError
          title={i18n.translate('xpack.agentBuilder.render.missingType', {
            defaultMessage: 'Render is missing a type',
          })}
        />
      );
    }

    return (
      <ResolvedRender
        path={path}
        renderType={renderType}
        conversationId={conversationId}
        renderersService={renderersService}
        conversationsService={conversationsService}
      />
    );
  };
};
