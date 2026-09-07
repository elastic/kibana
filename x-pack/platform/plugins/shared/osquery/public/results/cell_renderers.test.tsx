/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgentNameRenderer, EcsMappingRenderer, formatValue } from './cell_renderers';

describe('cell_renderers', () => {
  describe('formatValue', () => {
    it('returns "-" for null/undefined', () => {
      expect(formatValue(null)).toBe('-');
      expect(formatValue(undefined)).toBe('-');
    });

    it('stringifies arrays', () => {
      expect(formatValue(['a', 'b'])).toBe(JSON.stringify(['a', 'b'], null, 2));
    });

    it('stringifies objects', () => {
      expect(formatValue({ key: 'val' })).toBe(JSON.stringify({ key: 'val' }, null, 2));
    });

    it('converts scalars to string', () => {
      expect(formatValue('hello')).toBe('hello');
      expect(formatValue(42)).toBe('42');
      expect(formatValue(true)).toBe('true');
    });
  });

  describe('AgentNameRenderer', () => {
    const getFleetAppUrl = (agentId: string) => `/app/fleet/agents/${agentId}`;

    it('renders agent name as a Fleet link', () => {
      const row = {
        id: 'row-1',
        raw: { _source: {} },
        flattened: { 'agent.name': 'my-agent', 'agent.id': 'agent-123' },
      };
      render(<AgentNameRenderer row={row} getFleetAppUrl={getFleetAppUrl} />);
      const link = screen.getByText('my-agent');
      expect(link.closest('a')).toHaveAttribute('href', '/app/fleet/agents/agent-123');
    });

    it('renders agent name without link when no agent id', () => {
      const row = {
        id: 'row-2',
        raw: { _source: {} },
        flattened: { 'agent.name': 'orphan-agent' },
      };
      render(<AgentNameRenderer row={row} getFleetAppUrl={getFleetAppUrl} />);
      expect(screen.getByText('orphan-agent')).toBeInTheDocument();
      expect(screen.queryByRole('link')).toBeNull();
    });

    it('renders "-" when agent name is missing', () => {
      const row = {
        id: 'row-3',
        raw: { _source: {} },
        flattened: {},
      };
      render(<AgentNameRenderer row={row} getFleetAppUrl={getFleetAppUrl} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('EcsMappingRenderer', () => {
    it('resolves nested ECS field from _source', () => {
      const row = {
        id: 'row-4',
        raw: { _source: { destination: { ip: '10.0.0.1' } } },
        flattened: {},
      };
      render(<EcsMappingRenderer row={row} columnId="destination.ip" />);
      expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
    });

    it('renders "-" when field is missing from _source', () => {
      const row = {
        id: 'row-5',
        raw: { _source: {} },
        flattened: {},
      };
      render(<EcsMappingRenderer row={row} columnId="missing.field" />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('stringifies array values from _source', () => {
      const row = {
        id: 'row-6',
        raw: { _source: { 'host.ip': ['10.0.0.1', '10.0.0.2'] } },
        flattened: {},
      };
      const { container } = render(<EcsMappingRenderer row={row} columnId="host.ip" />);
      const text = container.textContent ?? '';
      expect(text).toContain('10.0.0.1');
      expect(text).toContain('10.0.0.2');
    });
  });
});
