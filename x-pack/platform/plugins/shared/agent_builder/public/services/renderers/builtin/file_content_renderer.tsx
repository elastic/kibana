/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiCodeBlock, EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { RendererUIDefinition } from '@kbn/agent-builder-browser';
import {
  FILE_CONTENT_RENDERER_TYPE,
  fileContentPayloadSchema,
  getLanguageFromFilePath,
  type FileContentPayload,
} from '../../../../common/renderers/file_content';
import { queryKeys } from '../../../application/query_keys';
import { useAgentBuilderServices } from '../../../application/hooks/use_agent_builder_service';

const tryPrettyPrintJson = (raw: string): string => {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};

interface FileContentRendererProps {
  payload: FileContentPayload;
  conversationId?: string;
  isCanvas: boolean;
}

export const FileContentRenderer: React.FC<FileContentRendererProps> = ({
  payload,
  conversationId,
  isCanvas,
}) => {
  const { conversationsService } = useAgentBuilderServices();

  const { isLoading, error, data } = useQuery({
    enabled: Boolean(conversationId),
    queryKey: queryKeys.workspaceFiles.byPath(conversationId ?? '', payload.file_path),
    queryFn: () =>
      conversationsService.readWorkspaceFile({
        conversationId: conversationId!,
        path: payload.file_path,
      }),
    retry: (failureCount, httpError: IHttpFetchError) =>
      httpError?.response?.status === 404 && failureCount < 3,
    retryDelay: 1000,
    staleTime: Infinity,
  });

  if (!conversationId || isLoading) {
    return <EuiSkeletonText lines={3} />;
  }

  if (error || !data) {
    return (
      <EuiCallOut
        color="danger"
        size="s"
        iconType="warning"
        title={i18n.translate('xpack.agentBuilder.renderers.fileContent.loadError', {
          defaultMessage: 'Unable to load file {path}',
          values: { path: payload.file_path },
        })}
      />
    );
  }

  const language = payload.language ?? getLanguageFromFilePath(payload.file_path) ?? 'text';

  const content = language === 'json' ? tryPrettyPrintJson(data.content) : data.content;

  return (
    <EuiCodeBlock
      language={language}
      fontSize="s"
      isCopyable
      overflowHeight={isCanvas ? undefined : 400}
    >
      {content}
    </EuiCodeBlock>
  );
};

export const fileContentRendererUIDefinition: RendererUIDefinition<
  typeof fileContentPayloadSchema
> = {
  type: FILE_CONTENT_RENDERER_TYPE,
  payloadSchema: fileContentPayloadSchema,
  render: (payload, ctx) => (
    <FileContentRenderer
      payload={payload}
      conversationId={ctx.conversationId}
      isCanvas={!!ctx.isCanvas}
    />
  ),
};
