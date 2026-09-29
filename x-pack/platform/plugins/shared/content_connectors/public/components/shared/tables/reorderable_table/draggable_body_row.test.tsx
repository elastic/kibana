/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';

vi.mock('@elastic/eui', async () => {
  const mocked = {
    ...(await vi.importActual('@elastic/eui')),
    EuiDraggable: vi.fn(({ children }: { children: (provided: object) => React.ReactNode }) => (
      <>{children({ dragHandleProps: {} })}</>
    )),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./body_row', () => {
  const mocked = {
    BodyRow: vi.fn(({ leftAction }: { leftAction?: React.ReactNode }) => (
      <div data-test-subj="bodyRow">{leftAction}</div>
    )),
  };
  return { ...mocked, default: mocked };
});

import { EuiDraggable } from '@elastic/eui';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';

import { BodyRow } from './body_row';
import { DraggableBodyRow } from './draggable_body_row';

interface Foo {
  id: number;
}

describe('DraggableBodyRow', () => {
  const columns = [
    {
      name: 'ID',
      flexBasis: 'foo',
      flexGrow: 0,
      alignItems: 'bar',
      render: (item: Foo) => item.id,
    },
    { name: 'Whatever', render: () => 'Whatever' },
  ];
  const item = { id: 1 };
  const additionalProps = {};

  const MockEuiDraggable = vi.mocked(EuiDraggable);
  const MockBodyRow = vi.mocked(BodyRow);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wraps a BodyRow with an EuiDraggable and injects a drag handle as the first cell', () => {
    const { container } = renderWithKibanaRenderContext(
      <DraggableBodyRow
        columns={columns}
        item={item}
        rowIndex={1}
        additionalProps={additionalProps}
      />
    );

    const draggableProps = MockEuiDraggable.mock.calls[0][0];
    expect(draggableProps.index).toEqual(1);
    expect(draggableProps.draggableId).toEqual('draggable_row_1');
    expect(draggableProps.customDragHandle).toBe(true);
    expect(draggableProps.hasInteractiveChildren).toBe(true);

    const bodyRowProps = MockBodyRow.mock.calls[0][0];
    expect(bodyRowProps).toEqual(expect.objectContaining({ columns, item, additionalProps }));

    // leftAction should contain the drag handle icon
    expect(container.querySelector('[data-euiicon-type="dragVertical"]')).not.toBeNull();
  });

  it('will accept a parameter that disables dragging', () => {
    renderWithKibanaRenderContext(
      <DraggableBodyRow columns={columns} item={item} rowIndex={1} disableDragging />
    );

    const draggableProps = MockEuiDraggable.mock.calls[0][0];
    expect(draggableProps.isDragDisabled).toBe(true);
    expect(draggableProps.customDragHandle).toBe(false);
  });
});
