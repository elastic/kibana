/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import type { FlattenRecord } from '@kbn/streams-schema';
import { buildCellActions } from '.';

const mockRoutingSnapshot = {
  matches: jest.fn(),
  context: {
    currentRuleId: 'test-rule-id',
    routing: [
      {
        id: 'test-rule-id',
        destination: 'test.stream',
        where: { field: 'existing', eq: 'value' },
        status: 'enabled',
      },
    ],
  },
};

jest.mock('../state_management/stream_routing_state_machine', () => ({
  useStreamsRoutingSelector: jest.fn((selector) => selector(mockRoutingSnapshot)),
  selectCurrentRule: jest.fn((context) => context.routing[0]),
}));

describe('buildCellActions', () => {
  let mockOnCreate: jest.Mock;
  let mockOnFilter: jest.Mock;
  let mockComponent: jest.Mock;

  const createMockCellActionProps = (
    rowIndex: number,
    columnId: string
  ): EuiDataGridColumnCellActionProps => ({
    Component: mockComponent,
    rowIndex,
    columnId,
    colIndex: 0,
    isExpanded: false,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnCreate = jest.fn();
    mockOnFilter = jest.fn();
    mockComponent = jest.fn(({ onClick, iconType, title, 'data-test-subj': testSubj }) => (
      <button onClick={onClick} title={title} data-icon={iconType} data-test-subj={testSubj}>
        {title}
      </button>
    ));
    mockRoutingSnapshot.matches.mockReturnValue(false);
  });

  describe('Undefined Values', () => {
    const context: FlattenRecord[] = [{ emptyField: undefined }];

    it('creates exists:false condition with + button', () => {
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);
      render(<>{cellActions[0](createMockCellActionProps(0, 'emptyField'))}</>);

      fireEvent.click(screen.getByRole('button'));

      expect(mockOnCreate).toHaveBeenCalled();
      expect(mockOnFilter).toHaveBeenCalledWith({
        where: { field: 'emptyField', exists: false },
      });
    });

    it('creates exists:true condition with - button', () => {
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);
      render(<>{cellActions[1](createMockCellActionProps(0, 'emptyField'))}</>);

      fireEvent.click(screen.getByRole('button'));

      expect(mockOnCreate).toHaveBeenCalled();
      expect(mockOnFilter).toHaveBeenCalledWith({
        where: { field: 'emptyField', exists: true },
      });
    });
  });

  describe('Boolean Values', () => {
    it('creates eq:"true" condition with + button on true value', () => {
      const context: FlattenRecord[] = [{ isActive: true }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[0](createMockCellActionProps(0, 'isActive'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith({
        where: { field: 'isActive', eq: 'true' },
      });
    });

    it('creates eq:"false" condition with + button on false value', () => {
      const context: FlattenRecord[] = [{ isDeleted: false }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[0](createMockCellActionProps(0, 'isDeleted'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith({
        where: { field: 'isDeleted', eq: 'false' },
      });
    });

    it('creates neq:"true" condition with - button on true value', () => {
      const context: FlattenRecord[] = [{ isActive: true }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[1](createMockCellActionProps(0, 'isActive'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith({
        where: { field: 'isActive', neq: 'true' },
      });
    });

    it('creates neq:"false" condition with - button on false value', () => {
      const context: FlattenRecord[] = [{ isActive: false }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[1](createMockCellActionProps(0, 'isActive'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith({
        where: { field: 'isActive', neq: 'false' },
      });
    });
  });

  describe('String Values', () => {
    it('creates eq condition with + button', () => {
      const context: FlattenRecord[] = [{ service: 'api' }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[0](createMockCellActionProps(0, 'service'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith({
        where: { field: 'service', eq: 'api' },
      });
    });

    it('creates neq condition with - button', () => {
      const context: FlattenRecord[] = [{ service: 'api' }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[1](createMockCellActionProps(0, 'service'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith({
        where: { field: 'service', neq: 'api' },
      });
    });
  });

  describe('Number Values', () => {
    it('creates eq condition with + button', () => {
      const context: FlattenRecord[] = [{ statusCode: 200 }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[0](createMockCellActionProps(0, 'statusCode'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith({
        where: { field: 'statusCode', eq: '200' },
      });
    });

    it('creates neq condition with - button', () => {
      const context: FlattenRecord[] = [{ statusCode: 404 }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[1](createMockCellActionProps(0, 'statusCode'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith({
        where: { field: 'statusCode', neq: '404' },
      });
    });

    it('handles zero value correctly', () => {
      const context: FlattenRecord[] = [{ count: 0 }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[0](createMockCellActionProps(0, 'count'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith({
        where: { field: 'count', eq: '0' },
      });
    });

    it('handles negative numbers', () => {
      const context: FlattenRecord[] = [{ temperature: -5 }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[0](createMockCellActionProps(0, 'temperature'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith({
        where: { field: 'temperature', eq: '-5' },
      });
    });

    it('handles decimal numbers', () => {
      const context: FlattenRecord[] = [{ price: 19.99 }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[0](createMockCellActionProps(0, 'price'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith({
        where: { field: 'price', eq: '19.99' },
      });
    });
  });

  describe('Icon Types', () => {
    it('uses plusInCircle icon for + button', () => {
      const context: FlattenRecord[] = [{ field: 'value' }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[0](createMockCellActionProps(0, 'field'))}</>);

      expect(screen.getByRole('button').getAttribute('data-icon')).toBe('plusInCircle');
    });

    it('uses minusInCircle icon for - button', () => {
      const context: FlattenRecord[] = [{ field: 'value' }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[1](createMockCellActionProps(0, 'field'))}</>);

      expect(screen.getByRole('button').getAttribute('data-icon')).toBe('minusInCircle');
    });
  });

  describe('Button Titles', () => {
    it('displays "equals" title for + button on defined values', () => {
      const context: FlattenRecord[] = [{ field: 'value' }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[0](createMockCellActionProps(0, 'field'))}</>);

      expect(screen.getByRole('button').title).toContain('equals');
    });

    it('displays "not equals" title for - button on defined values', () => {
      const context: FlattenRecord[] = [{ field: 'value' }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[1](createMockCellActionProps(0, 'field'))}</>);

      expect(screen.getByRole('button').title).toContain('not equals');
    });

    it('displays "exists" title for undefined fields', () => {
      const context: FlattenRecord[] = [{ emptyField: undefined }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[0](createMockCellActionProps(0, 'emptyField'))}</>);

      expect(screen.getByRole('button').title).toContain('exists');
    });
  });

  describe('Rule State Management', () => {
    const context: FlattenRecord[] = [{ field: 'value' }];

    it('calls onCreate when no rule is active', () => {
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[0](createMockCellActionProps(0, 'field'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnCreate).toHaveBeenCalledTimes(1);
      expect(mockOnFilter).toHaveBeenCalled();
    });

    it('does not call onCreate when rule is active', () => {
      mockRoutingSnapshot.matches.mockReturnValue(true);
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[0](createMockCellActionProps(0, 'field'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnCreate).not.toHaveBeenCalled();
      expect(mockOnFilter).toHaveBeenCalled();
    });

    it('merges with current rule when rule is active', () => {
      mockRoutingSnapshot.matches.mockReturnValue(true);
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[0](createMockCellActionProps(0, 'field'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith({
        id: 'test-rule-id',
        destination: 'test.stream',
        where: { field: 'field', eq: 'value' },
        status: 'enabled',
      });
    });
  });

  describe('Cell Actions Array', () => {
    it('returns array with two cell actions', () => {
      const context: FlattenRecord[] = [{ field: 'value' }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      expect(cellActions).toHaveLength(2);
      expect(typeof cellActions[0]).toBe('function');
      expect(typeof cellActions[1]).toBe('function');
    });

    it('creates independent + and - actions', () => {
      const context: FlattenRecord[] = [{ field: 'value' }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      const { rerender } = render(<>{cellActions[0](createMockCellActionProps(0, 'field'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ eq: 'value' }) })
      );

      mockOnFilter.mockClear();
      rerender(<>{cellActions[1](createMockCellActionProps(0, 'field'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ neq: 'value' }) })
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string value', () => {
      const context: FlattenRecord[] = [{ field: '' }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[0](createMockCellActionProps(0, 'field'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith({
        where: { field: 'field', eq: '' },
      });
    });

    it('handles special characters in strings', () => {
      const context: FlattenRecord[] = [{ email: 'test@example.com' }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      render(<>{cellActions[0](createMockCellActionProps(0, 'email'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith({
        where: { field: 'email', eq: 'test@example.com' },
      });
    });

    it('handles different row indices', () => {
      const context: FlattenRecord[] = [{ service: 'api' }, { service: 'web' }];
      const cellActions = buildCellActions(context, mockOnCreate, mockOnFilter);

      const { rerender } = render(<>{cellActions[0](createMockCellActionProps(0, 'service'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ eq: 'api' }) })
      );

      mockOnFilter.mockClear();
      rerender(<>{cellActions[0](createMockCellActionProps(1, 'service'))}</>);
      fireEvent.click(screen.getByRole('button'));

      expect(mockOnFilter).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ eq: 'web' }) })
      );
    });
  });
});
