/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { DataTableRecord } from '@kbn/discover-utils';

import { getStatusCellRenderers } from './status_cell_renderers';

const mockGetFleetAppUrl = jest.fn((agentId: string) => `/app/fleet/agents/${agentId}`);

const createMockRow = (flattened: Record<string, unknown>): DataTableRecord =>
  ({
    id: 'test-row',
    raw: { _id: 'test-row', _index: 'test' },
    flattened,
  } as DataTableRecord);

const createCellProps = (row: DataTableRecord): DataGridCellValueElementProps =>
  ({
    row,
    isDetails: false,
    isExpanded: false,
    columnId: '',
    setCellProps: jest.fn(),
    colIndex: 0,
    rowIndex: 0,
    isExpandable: false,
  } as unknown as DataGridCellValueElementProps);

describe('getStatusCellRenderers', () => {
  const renderers = getStatusCellRenderers({ getFleetAppUrl: mockGetFleetAppUrl });

  describe('agent_id renderer', () => {
    it('should render agent name as a link with tooltip', () => {
      const row = createMockRow({
        agent_id: 'host-alpha',
        _raw_agent_id: 'agent-123',
      });

      render(<>{renderers.agent_id(createCellProps(row))}</>);

      const link = screen.getByRole('link', { name: /host-alpha/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/app/fleet/agents/agent-123');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('should fall back to dash when no rawAgentId', () => {
      const row = createMockRow({ agent_id: '', _raw_agent_id: '' });

      const { container } = render(<>{renderers.agent_id(createCellProps(row))}</>);

      expect(container.textContent).toBe('-');
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('should show agent name when rawAgentId is missing', () => {
      const row = createMockRow({ agent_id: 'some-name', _raw_agent_id: '' });

      const { container } = render(<>{renderers.agent_id(createCellProps(row))}</>);

      expect(container.textContent).toBe('some-name');
    });
  });

  describe('action_response.osquery.count renderer', () => {
    it('should render count as string', () => {
      const row = createMockRow({ 'action_response.osquery.count': 42 });

      const { container } = render(
        <>{renderers['action_response.osquery.count'](createCellProps(row))}</>
      );

      expect(container.textContent).toBe('42');
    });

    it('should render zero count', () => {
      const row = createMockRow({ 'action_response.osquery.count': 0 });

      const { container } = render(
        <>{renderers['action_response.osquery.count'](createCellProps(row))}</>
      );

      expect(container.textContent).toBe('0');
    });

    it('should render dash when count is null', () => {
      const row = createMockRow({ 'action_response.osquery.count': null });

      const { container } = render(
        <>{renderers['action_response.osquery.count'](createCellProps(row))}</>
      );

      expect(container.textContent).toBe('-');
    });

    it('should render dash when count is undefined', () => {
      const row = createMockRow({});

      const { container } = render(
        <>{renderers['action_response.osquery.count'](createCellProps(row))}</>
      );

      expect(container.textContent).toBe('-');
    });
  });

  describe('error renderer', () => {
    it('should render error message in code block', () => {
      const row = createMockRow({ error: 'Query execution failed' });

      render(<>{renderers.error(createCellProps(row))}</>);

      expect(screen.getByText('Query execution failed')).toBeInTheDocument();
    });

    it('should render dash when error is empty', () => {
      const row = createMockRow({ error: '' });

      const { container } = render(<>{renderers.error(createCellProps(row))}</>);

      expect(container.textContent).toBe('-');
    });

    it('should render dash when error is undefined', () => {
      const row = createMockRow({});

      const { container } = render(<>{renderers.error(createCellProps(row))}</>);

      expect(container.textContent).toBe('-');
    });
  });
});
