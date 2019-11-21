/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, shallow, mount } from 'enzyme';
import { DragDrop } from './drag_drop';
import { ChildDragDropProvider } from './providers';

jest.useFakeTimers();

describe('DragDrop', () => {
  test('renders if nothing is being dragged', () => {
    const component = render(
      <DragDrop value="hello" draggable>
        Hello!
      </DragDrop>
    );

    expect(component).toMatchSnapshot();
  });

  test('dragover calls preventDefault if droppable is true', () => {
    const preventDefault = jest.fn();
    const component = shallow(<DragDrop droppable>Hello!</DragDrop>);

    component.find('[data-test-subj="lnsDragDrop"]').simulate('dragover', { preventDefault });

    expect(preventDefault).toBeCalled();
  });

  test('dragover does not call preventDefault if droppable is false', () => {
    const preventDefault = jest.fn();
    const component = shallow(<DragDrop>Hello!</DragDrop>);

    component.find('[data-test-subj="lnsDragDrop"]').simulate('dragover', { preventDefault });

    expect(preventDefault).not.toBeCalled();
  });

  test('dragstart sets dragging in the context', async () => {
    const setDragging = jest.fn();
    const dataTransfer = {
      setData: jest.fn(),
      getData: jest.fn(),
    };
    const value = {};

    const component = mount(
      <ChildDragDropProvider dragging={undefined} setDragging={setDragging}>
        <DragDrop value={value}>Hello!</DragDrop>
      </ChildDragDropProvider>
    );

    component.find('[data-test-subj="lnsDragDrop"]').simulate('dragstart', { dataTransfer });

    jest.runAllTimers();

    expect(dataTransfer.setData).toBeCalledWith('text', 'dragging');
    expect(setDragging).toBeCalledWith(value);
  });

  test('drop resets all the things', async () => {
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    const setDragging = jest.fn();
    const onDrop = jest.fn();
    const value = {};

    const component = mount(
      <ChildDragDropProvider dragging="hola" setDragging={setDragging}>
        <DragDrop onDrop={onDrop} droppable={true} value={value}>
          Hello!
        </DragDrop>
      </ChildDragDropProvider>
    );

    component
      .find('[data-test-subj="lnsDragDrop"]')
      .simulate('drop', { preventDefault, stopPropagation });

    expect(preventDefault).toBeCalled();
    expect(stopPropagation).toBeCalled();
    expect(setDragging).toBeCalledWith(undefined);
    expect(onDrop).toBeCalledWith('hola');
  });

  test('drop function is not called on droppable=false', async () => {
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    const setDragging = jest.fn();
    const onDrop = jest.fn();

    const component = mount(
      <ChildDragDropProvider dragging="hola" setDragging={setDragging}>
        <DragDrop onDrop={onDrop} droppable={false} value={{}}>
          Hello!
        </DragDrop>
      </ChildDragDropProvider>
    );

    component
      .find('[data-test-subj="lnsDragDrop"]')
      .simulate('drop', { preventDefault, stopPropagation });

    expect(preventDefault).toBeCalled();
    expect(stopPropagation).toBeCalled();
    expect(setDragging).toBeCalledWith(undefined);
    expect(onDrop).not.toHaveBeenCalled();
  });

  test('droppable is reflected in the className', () => {
    const component = render(
      <DragDrop
        onDrop={(x: unknown) => {
          throw x;
        }}
        droppable
      >
        Hello!
      </DragDrop>
    );

    expect(component).toMatchSnapshot();
  });
});
