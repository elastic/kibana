/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiDraggable, EuiIcon } from '@elastic/eui';

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
    {
      name: 'Whatever',
      render: () => 'Whatever',
    },
  ];
  const item = { id: 1 };
  const additionalProps = {};

  it('wraps a BodyRow with an EuiDraggable and injects a drag handle as the first cell', () => {
    const wrapper = shallow(
      <DraggableBodyRow
        columns={columns}
        item={item}
        rowIndex={1}
        additionalProps={additionalProps}
      />
    );

    const euiDraggable = wrapper.find(EuiDraggable);
    expect(euiDraggable.exists()).toBe(true);
    // It adds an index and unique draggable id from the provided rowIndex
    expect(euiDraggable.prop('index')).toEqual(1);
    expect(euiDraggable.prop('draggableId')).toEqual('draggable_row_1');

    const bodyRow = wrapper.find(BodyRow);
    expect(bodyRow.exists()).toEqual(true);
    expect(bodyRow.props()).toEqual(expect.objectContaining({ columns, item, additionalProps }));
    const leftAction = shallow(<div>{bodyRow.prop('leftAction')}</div>);
    expect(leftAction.find(EuiIcon).exists()).toBe(true);
  });

  it('will accept a parameter that disables dragging', () => {
    const wrapper = shallow(
      <DraggableBodyRow columns={columns} item={item} rowIndex={1} disableDragging />
    );

    const euiDraggable = wrapper.find(EuiDraggable);
    expect(euiDraggable.prop('isDragDisabled')).toBe(true);
    expect(euiDraggable.prop('disableInteractiveElementBlocking')).toBe(true);
  });
});
