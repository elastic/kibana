/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { z } from '@kbn/zod/v4';
import type { RendererUIDefinition } from '@kbn/agent-builder-browser';
import { createRenderRenderer } from './render_plugin';

const okRenderer = (renderImpl: (payload: any) => React.ReactNode): RendererUIDefinition =>
  ({
    type: 'table',
    payloadSchema: z.object({ ok: z.boolean() }),
    render: renderImpl,
  } as unknown as RendererUIDefinition);

const makeServices = ({
  content,
  renderer,
  readError,
}: {
  content?: string;
  renderer?: RendererUIDefinition;
  readError?: Error;
}) => {
  const readWorkspaceFile = readError
    ? jest.fn().mockRejectedValue(readError)
    : jest.fn().mockResolvedValue({ path: '/workspace/x.json', content });
  const conversationsService = { readWorkspaceFile } as any;
  const renderersService = {
    getRendererUiDefinition: jest.fn().mockReturnValue(renderer),
  } as any;
  return { conversationsService, renderersService };
};

const renderDirective = (
  services: ReturnType<typeof makeServices>,
  opts: { isStreaming?: boolean; renderType?: string | null } = {}
) => {
  const { isStreaming = false } = opts;
  // `null` means "tag had no type attribute"; absent means the default 'table'.
  const renderType = 'renderType' in opts ? opts.renderType ?? undefined : 'table';
  const Renderer = createRenderRenderer({
    renderersService: services.renderersService,
    conversationsService: services.conversationsService,
    conversationId: 'conv-1',
    isStreaming,
  });
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <Renderer path="/workspace/renders/table/x.json" renderType={renderType} />
    </QueryClientProvider>
  );
};

describe('createRenderRenderer', () => {
  it('does not fetch while streaming', () => {
    const services = makeServices({ content: '{}' });
    renderDirective(services, { isStreaming: true });
    expect(services.conversationsService.readWorkspaceFile).not.toHaveBeenCalled();
  });

  it('shows an error (without fetching) when the directive has no type', () => {
    const services = makeServices({ content: '{}' });
    renderDirective(services, { renderType: null });

    expect(screen.getByText(/missing a type/)).toBeInTheDocument();
    expect(services.conversationsService.readWorkspaceFile).not.toHaveBeenCalled();
  });

  it('validates the raw payload and mounts the renderer selected by the tag type', async () => {
    const renderImpl = jest.fn(() => <div>RENDERED</div>);
    const services = makeServices({
      content: JSON.stringify({ ok: true }),
      renderer: okRenderer(renderImpl),
    });

    renderDirective(services);

    expect(await screen.findByText('RENDERED')).toBeInTheDocument();
    expect(renderImpl).toHaveBeenCalledWith({ ok: true }, { isCanvas: false });
    expect(services.renderersService.getRendererUiDefinition).toHaveBeenCalledWith('table');
  });

  it('shows an error when the renderer type is unknown', async () => {
    const services = makeServices({
      content: JSON.stringify({ ok: true }),
      renderer: undefined,
    });

    renderDirective(services, { renderType: 'nope' });

    expect(await screen.findByText(/No renderer registered/)).toBeInTheDocument();
  });

  it('shows an error when the payload fails schema validation', async () => {
    const services = makeServices({
      content: JSON.stringify({ ok: 'not-a-boolean' }),
      renderer: okRenderer(() => <div>RENDERED</div>),
    });

    renderDirective(services);

    expect(await screen.findByText(/payload is invalid/)).toBeInTheDocument();
  });

  it('shows an error when the file cannot be read', async () => {
    const services = makeServices({ readError: new Error('boom') });

    renderDirective(services);

    expect(await screen.findByText(/Unable to load render/)).toBeInTheDocument();
  });

  it('shows an error when the file is not valid JSON', async () => {
    const services = makeServices({ content: 'not json' });

    renderDirective(services);

    expect(await screen.findByText(/not valid JSON/)).toBeInTheDocument();
  });

  it('contains a throwing renderer in an error boundary instead of crashing', async () => {
    const services = makeServices({
      content: JSON.stringify({ ok: true }),
      renderer: okRenderer(() => {
        throw new Error('renderer exploded');
      }),
    });

    expect(() => renderDirective(services)).not.toThrow();
    expect(await screen.findByText(/renderer exploded/)).toBeInTheDocument();
  });
});
