/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { AgentBuilderServicesContext } from '../../../application/context/agent_builder_services_context';
import {
  FileContentRenderer,
  fileContentRendererUIDefinition,
} from './file_content_renderer';
import type { FileContentPayload } from '../../../../common/renderers/file_content';

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderComponent = ({
  payload,
  conversationId,
  isCanvas = false,
  content,
  readError,
}: {
  payload: FileContentPayload;
  conversationId?: string;
  isCanvas?: boolean;
  content?: string;
  readError?: Error;
}) => {
  const readWorkspaceFile = readError
    ? jest.fn().mockRejectedValue(readError)
    : jest.fn().mockResolvedValue({ path: payload.file_path, content: content ?? '' });
  const services = { conversationsService: { readWorkspaceFile } } as any;
  const result = render(
    <QueryClientProvider client={makeQueryClient()}>
      <AgentBuilderServicesContext.Provider value={services}>
        <FileContentRenderer
          payload={payload}
          conversationId={conversationId}
          isCanvas={isCanvas}
        />
      </AgentBuilderServicesContext.Provider>
    </QueryClientProvider>
  );
  return { ...result, readWorkspaceFile };
};

describe('FileContentRenderer', () => {
  it('registers under type "file_content"', () => {
    expect(fileContentRendererUIDefinition.type).toBe('file_content');
  });

  it('shows a skeleton and does not fetch when conversationId is missing', () => {
    const { container, readWorkspaceFile } = renderComponent({
      payload: { file_path: '/workspace/notes/plan.md' },
      conversationId: undefined,
      content: '# hi',
    });
    expect(container.querySelector('.euiSkeletonText')).toBeInTheDocument();
    expect(readWorkspaceFile).not.toHaveBeenCalled();
  });

  it('renders markdown files as raw source in a code block', async () => {
    renderComponent({
      payload: { file_path: '/workspace/notes/plan.md' },
      conversationId: 'conv-1',
      content: '# Hello world\n\nsome text',
    });
    const codeEl = await waitFor(() => {
      const el = document.querySelector('code');
      if (!el) throw new Error('no <code> yet');
      return el;
    });
    expect(codeEl.textContent).toBe('# Hello world\n\nsome text');
  });

  it('pretty-prints JSON files inside a code block', async () => {
    renderComponent({
      payload: { file_path: '/workspace/data/x.json' },
      conversationId: 'conv-1',
      content: '{"b":2,"a":1}',
    });
    const codeEl = await waitFor(() => {
      const el = document.querySelector('code');
      if (!el) throw new Error('no <code> yet');
      return el;
    });
    // Pretty-printed: newline between keys, and 2-space indent.
    expect(codeEl.textContent).toContain('\n');
    expect(codeEl.textContent).toContain('  "b": 2');
  });

  it('falls back to raw content when JSON is invalid', async () => {
    renderComponent({
      payload: { file_path: '/workspace/data/x.json' },
      conversationId: 'conv-1',
      content: 'not json',
    });
    const codeEl = await waitFor(() => {
      const el = document.querySelector('code');
      if (!el) throw new Error('no <code> yet');
      return el;
    });
    expect(codeEl.textContent).toBe('not json');
  });

  it('renders unknown extensions as a plain-text code block', async () => {
    renderComponent({
      payload: { file_path: '/workspace/notes/thing.wat' },
      conversationId: 'conv-1',
      content: 'plain content',
    });
    const codeEl = await waitFor(() => {
      const el = document.querySelector('code');
      if (!el) throw new Error('no <code> yet');
      return el;
    });
    expect(codeEl.textContent).toBe('plain content');
  });

  it('honours the language override when provided', async () => {
    renderComponent({
      payload: { file_path: '/workspace/notes/thing.wat', language: 'json' },
      conversationId: 'conv-1',
      content: '{"x":1}',
    });
    const codeEl = await waitFor(() => {
      const el = document.querySelector('code');
      if (!el) throw new Error('no <code> yet');
      return el;
    });
    // language=json triggers pretty-print.
    expect(codeEl.textContent).toContain('  "x": 1');
  });

  it('shows an error callout when the fetch fails', async () => {
    renderComponent({
      payload: { file_path: '/workspace/missing.md' },
      conversationId: 'conv-1',
      readError: new Error('boom'),
    });
    expect(await screen.findByText(/Unable to load file/)).toBeInTheDocument();
  });
});
