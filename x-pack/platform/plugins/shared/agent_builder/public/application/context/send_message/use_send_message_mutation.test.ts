/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { buildScreenContextData } from './use_send_message_mutation';
import type { StartServices } from '../../hooks/use_kibana';

const mockServices = {
  application: { currentAppId$: of('agent_builder') },
  plugins: { data: undefined },
} as unknown as StartServices;

describe('buildScreenContextData', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/app/agent_builder',
        search: '',
        hash: '',
        href: 'http://proxy.example.com/app/agent_builder',
      },
      writable: true,
    });
  });

  it('uses a relative URL instead of window.location.href', async () => {
    const result = await buildScreenContextData({ services: mockServices });
    expect(result?.url).toBe('/app/agent_builder');
  });

  it('does not include the host in the URL', async () => {
    const result = await buildScreenContextData({ services: mockServices });
    expect(result?.url).not.toContain('http://');
    expect(result?.url).not.toContain('proxy.example.com');
  });

  it('includes search params and hash in the relative URL', async () => {
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/app/agent_builder',
        search: '?tab=chat',
        hash: '#section',
        href: 'http://proxy.example.com/app/agent_builder?tab=chat#section',
      },
      writable: true,
    });
    const result = await buildScreenContextData({ services: mockServices });
    expect(result?.url).toBe('/app/agent_builder?tab=chat#section');
  });
});
