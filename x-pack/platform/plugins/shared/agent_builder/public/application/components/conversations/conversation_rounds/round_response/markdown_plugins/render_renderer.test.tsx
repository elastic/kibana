/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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
  { isStreaming = false, renderType = 'table' }: { isStreaming?: boolean; renderType?: string } = {}
) => {
  const Renderer = createRenderRenderer({
    renderersService: services.renderersService,
    conversationsService: services.conversationsService,
    conversationId: 'conv-1',
    isStreaming,
  });
  return render(<Renderer path="/workspace/renders/table/x.json" renderType={renderType} />);
};

describe('createRenderRenderer', () => {
  it('does not fetch while streaming', () => {
    const services = makeServices({ content: '{}' });
    renderDirective(services, { isStreaming: true });
    expect(services.conversationsService.readWorkspaceFile).not.toHaveBeenCalled();
  });

  it('validates the payload and mounts the registered renderer', async () => {
    const renderImpl = jest.fn(() => <div>RENDERED</div>);
    const services = makeServices({
      content: JSON.stringify({ type: 'table', data: { ok: true } }),
      renderer: okRenderer(renderImpl),
    });

    renderDirective(services);

    expect(await screen.findByText('RENDERED')).toBeInTheDocument();
    expect(renderImpl).toHaveBeenCalledWith({ ok: true }, { isCanvas: false });
  });

  it('shows an error when the renderer type is unknown', async () => {
    const services = makeServices({
      content: JSON.stringify({ type: 'nope', data: {} }),
      renderer: undefined,
    });

    renderDirective(services);

    expect(await screen.findByText(/No renderer registered/)).toBeInTheDocument();
  });

  it('shows an error when the payload fails schema validation', async () => {
    const services = makeServices({
      content: JSON.stringify({ type: 'table', data: { ok: 'not-a-boolean' } }),
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

  it('falls back to the tag type when the file omits it', async () => {
    const renderImpl = jest.fn(() => <div>RENDERED</div>);
    const services = makeServices({
      content: JSON.stringify({ data: { ok: true } }),
      renderer: okRenderer(renderImpl),
    });

    renderDirective(services, { renderType: 'table' });

    expect(await screen.findByText('RENDERED')).toBeInTheDocument();
    expect(services.renderersService.getRendererUiDefinition).toHaveBeenCalledWith('table');
  });
});
