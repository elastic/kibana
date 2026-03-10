/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { getOsqueryCellRenderers } from './cell_renderers';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

describe('cell_renderers', () => {
  const mockGetFleetAppUrl = jest.fn((agentId: string) => `/fleet/agents/${agentId}`);
  const mockFieldFormats = {} as FieldFormatsStart;
  const mockDataView = {} as DataView;

  const createMockProps = (
    flattened: Record<string, unknown>,
    raw: Record<string, unknown> = {}
  ): DataGridCellValueElementProps => ({
    rowIndex: 0,
    columnId: 'test',
    isDetails: false,
    setCellProps: jest.fn(),
    isExpandable: false,
    isExpanded: false,
    colIndex: 0,
    row: {
      id: 'test-id',
      raw: { _source: raw } as DataGridCellValueElementProps['row']['raw'],
      flattened,
    },
    dataView: mockDataView,
    fieldFormats: mockFieldFormats,
    closePopover: jest.fn(),
  });

  beforeEach(() => {
    mockGetFleetAppUrl.mockClear();
  });

  describe('getOsqueryCellRenderers', () => {
    it('should return renderers for agent.name column', () => {
      const renderers = getOsqueryCellRenderers({
        getFleetAppUrl: mockGetFleetAppUrl,
        ecsMappingColumns: [],
      });

      expect(renderers['agent.name']).toBeDefined();
    });

    it('should return renderers for ECS mapping columns', () => {
      const renderers = getOsqueryCellRenderers({
        getFleetAppUrl: mockGetFleetAppUrl,
        ecsMappingColumns: ['destination.ip', 'source.port'],
      });

      expect(renderers['destination.ip']).toBeDefined();
      expect(renderers['source.port']).toBeDefined();
    });
  });

  describe('AgentNameRenderer', () => {
    it('should render agent name as link to Fleet', () => {
      const renderers = getOsqueryCellRenderers({
        getFleetAppUrl: mockGetFleetAppUrl,
        ecsMappingColumns: [],
      });

      const AgentRenderer = renderers['agent.name'];
      const props = createMockProps({
        'agent.name': 'test-agent',
        'agent.id': 'agent-123',
      });

      render(<AgentRenderer {...props} />);

      const link = screen.getByRole('link', { name: 'test-agent' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/fleet/agents/agent-123');
      expect(mockGetFleetAppUrl).toHaveBeenCalledWith('agent-123');
    });

    it('should render "-" when agent.name is missing', () => {
      const renderers = getOsqueryCellRenderers({
        getFleetAppUrl: mockGetFleetAppUrl,
        ecsMappingColumns: [],
      });

      const AgentRenderer = renderers['agent.name'];
      const props = createMockProps({});

      render(<AgentRenderer {...props} />);

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should render name without link when agent.id is missing', () => {
      const renderers = getOsqueryCellRenderers({
        getFleetAppUrl: mockGetFleetAppUrl,
        ecsMappingColumns: [],
      });

      const AgentRenderer = renderers['agent.name'];
      const props = createMockProps({
        'agent.name': 'orphan-agent',
      });

      render(<AgentRenderer {...props} />);

      expect(screen.getByText('orphan-agent')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('EcsMappingRenderer', () => {
    it('should render ECS field value from _source', () => {
      const renderers = getOsqueryCellRenderers({
        getFleetAppUrl: mockGetFleetAppUrl,
        ecsMappingColumns: ['destination.ip'],
      });

      const EcsRenderer = renderers['destination.ip'];
      const props = createMockProps({}, { 'destination.ip': '192.168.1.1' });

      render(<EcsRenderer {...props} />);

      expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    });

    it('should render ECS field value from nested _source object', () => {
      const renderers = getOsqueryCellRenderers({
        getFleetAppUrl: mockGetFleetAppUrl,
        ecsMappingColumns: ['process.pid'],
      });

      const EcsRenderer = renderers['process.pid'];
      const props = createMockProps({}, { process: { pid: 1234 } });

      render(<EcsRenderer {...props} />);

      expect(screen.getByText('1234')).toBeInTheDocument();
    });

    it('should render deeply nested ECS field from _source', () => {
      const renderers = getOsqueryCellRenderers({
        getFleetAppUrl: mockGetFleetAppUrl,
        ecsMappingColumns: ['process.parent.pid'],
      });

      const EcsRenderer = renderers['process.parent.pid'];
      const props = createMockProps({}, { process: { parent: { pid: 682 } } });

      render(<EcsRenderer {...props} />);

      expect(screen.getByText('682')).toBeInTheDocument();
    });

    it('should render "-" when ECS field is missing', () => {
      const renderers = getOsqueryCellRenderers({
        getFleetAppUrl: mockGetFleetAppUrl,
        ecsMappingColumns: ['destination.ip'],
      });

      const EcsRenderer = renderers['destination.ip'];
      const props = createMockProps({}, {});

      render(<EcsRenderer {...props} />);

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should stringify array values', () => {
      const renderers = getOsqueryCellRenderers({
        getFleetAppUrl: mockGetFleetAppUrl,
        ecsMappingColumns: ['array.field'],
      });

      const EcsRenderer = renderers['array.field'];
      const arrayValue = ['value1', 'value2'];
      const props = createMockProps({}, { 'array.field': arrayValue });

      const { container } = render(<EcsRenderer {...props} />);

      expect(container.textContent).toBe(JSON.stringify(arrayValue, null, 2));
    });

    it('should stringify object values', () => {
      const renderers = getOsqueryCellRenderers({
        getFleetAppUrl: mockGetFleetAppUrl,
        ecsMappingColumns: ['object.field'],
      });

      const EcsRenderer = renderers['object.field'];
      const objectValue = { key: 'value' };
      const props = createMockProps({}, { 'object.field': objectValue });

      const { container } = render(<EcsRenderer {...props} />);

      expect(container.textContent).toBe(JSON.stringify(objectValue, null, 2));
    });
  });
});
