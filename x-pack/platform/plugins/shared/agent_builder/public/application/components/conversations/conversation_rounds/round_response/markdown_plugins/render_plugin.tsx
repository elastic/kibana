/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { EuiCallOut, EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { renderFileSchema } from '@kbn/agent-builder-common';
import { renderElement } from '@kbn/agent-builder-common/tools/custom_rendering';
import type { RenderersService, ConversationsService } from '../../../../../../services';
import { createTagParser } from './utils';

/**
 * Parser for <render> tags in markdown.
 * Converts HTML/text nodes containing render tags into structured AST nodes
 * carrying the workspace `path` and renderer `type`.
 *
 * The `type` attribute is mapped onto a `renderType` node field because a
 * unist/mdast node's `type` is its kind (here, `'render'`).
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
 * Resolves a `<render>` directive once its workspace file is available.
 */
const ResolvedRender: React.FC<{
  path: string;
  renderType?: string;
  conversationId: string;
  renderersService: RenderersService;
  conversationsService: ConversationsService;
}> = ({ path, renderType, conversationId, renderersService, conversationsService }) => {
  const state = useAsync(
    () => conversationsService.readWorkspaceFile({ conversationId, path }),
    [conversationId, path]
  );

  if (state.loading) {
    return <EuiSkeletonText lines={3} />;
  }

  if (state.error || !state.value) {
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
    parsedJson = JSON.parse(state.value.content);
  } catch {
    return (
      <RenderError
        title={i18n.translate('xpack.agentBuilder.render.invalidJson', {
          defaultMessage: 'Render file is not valid JSON',
        })}
      />
    );
  }

  const fileResult = renderFileSchema.safeParse(parsedJson);
  if (!fileResult.success) {
    return (
      <RenderError
        title={i18n.translate('xpack.agentBuilder.render.invalidFile', {
          defaultMessage: 'Render file does not match the expected format',
        })}
      />
    );
  }

  const type = fileResult.data.type ?? renderType;
  if (!type) {
    return (
      <RenderError
        title={i18n.translate('xpack.agentBuilder.render.missingType', {
          defaultMessage: 'Render is missing a type',
        })}
      />
    );
  }

  const definition = renderersService.getRendererUiDefinition(type);
  if (!definition) {
    return (
      <RenderError
        title={i18n.translate('xpack.agentBuilder.render.unknownType', {
          defaultMessage: 'No renderer registered for type "{type}"',
          values: { type },
        })}
      />
    );
  }

  const payloadResult = definition.payloadSchema.safeParse(fileResult.data.data);
  if (!payloadResult.success) {
    return (
      <RenderError
        title={i18n.translate('xpack.agentBuilder.render.invalidPayload', {
          defaultMessage: 'Render payload is invalid for type "{type}"',
          values: { type },
        })}
      >
        {payloadResult.error.issues.map((issue) => (
          <div key={issue.path.join('.')}>{issue.message}</div>
        ))}
      </RenderError>
    );
  }

  return <>{definition.render(payloadResult.data, { isCanvas: false })}</>;
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
