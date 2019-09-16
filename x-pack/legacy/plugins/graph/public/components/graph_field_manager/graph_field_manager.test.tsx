/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiColorPicker, EuiSelectable } from '@elastic/eui';
import { FieldPicker } from './field_picker';
import { FieldEditor } from './field_editor';
import { GraphStore, createGraphStore, loadFields } from '../../state_management';
import { getSuitableIcon } from '../../services/style_choices';
import { shallow, ShallowWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { GraphFieldManager } from './graph_field_manager';

describe('graph_field_manager', () => {
  let store: GraphStore;
  let instance: ShallowWrapper;
  let dispatchSpy: jest.Mock;

  beforeEach(() => {
    store = createGraphStore();
    store.dispatch(
      loadFields([
        {
          name: 'field1',
          color: 'red',
          icon: getSuitableIcon('field1'),
          selected: true,
          type: 'string',
          hopSize: 5,
        },
        {
          name: 'field2',
          color: 'blue',
          icon: getSuitableIcon('field2'),
          selected: true,
          type: 'string',
          hopSize: 0,
          lastValidHopSize: 5,
        },
        {
          name: 'field3',
          color: 'green',
          icon: getSuitableIcon('field3'),
          selected: false,
          type: 'string',
          hopSize: 5,
        },
      ])
    );

    dispatchSpy = jest.fn(store.dispatch);

    instance = shallow(<GraphFieldManager state={store.getState()} dispatch={dispatchSpy} />);
  });

  function update() {
    instance.setProps({
      state: store.getState(),
      dispatch: dispatchSpy,
    });
  }

  it('should list editors for all selected fields', () => {
    expect(instance.find(FieldEditor).length).toEqual(2);
    expect(
      instance
        .find(FieldEditor)
        .at(0)
        .prop('field').name
    ).toEqual('field1');
    expect(
      instance
        .find(FieldEditor)
        .at(1)
        .prop('field').name
    ).toEqual('field2');
  });

  it('should select fields from picker', () => {
    const fieldPicker = instance.find(FieldPicker).dive();
    expect(
      fieldPicker
        .find(EuiSelectable)
        .prop('options')
        .map((option: { label: string }) => option.label)
    ).toEqual(['field3']);

    act(() => {
      fieldPicker.find(EuiSelectable).prop('onChange')([{ checked: 'on', label: 'field3' }]);
    });
    act(() => {
      fieldPicker.find('[data-test-subj="graphFieldPickerAdd"]').simulate('click');
    });

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'x-pack/graph/fields/SELECT_FIELD',
      payload: 'field3',
    });

    update();
    expect(instance.find(FieldEditor).length).toEqual(3);
  });

  it('should deselect field', () => {
    act(() => {
      instance
        .find(FieldEditor)
        .at(0)
        .dive()
        .find('[data-test-subj="graphFieldEditorRemove"]')
        .simulate('click');
    });

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'x-pack/graph/fields/DESELECT_FIELD',
      payload: 'field1',
    });

    update();
    expect(instance.find(FieldEditor).length).toEqual(1);
  });

  it('should disable field', () => {
    const firstFieldEditor = instance
      .find(FieldEditor)
      .at(0)
      .dive();
    expect(
      firstFieldEditor.find('[data-test-subj="graphFieldEditorDisable"]').prop('checked')
    ).toEqual(false);
    act(() => {
      firstFieldEditor.find('[data-test-subj="graphFieldEditorDisable"]').prop('onChange')!(
        {} as React.MouseEvent
      );
    });

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'x-pack/graph/fields/UPDATE_FIELD_PROPERTIES',
      payload: {
        fieldName: 'field1',
        fieldProperties: {
          hopSize: 0,
          lastValidHopSize: 5,
        },
      },
    });

    update();

    expect(
      instance
        .find(FieldEditor)
        .at(0)
        .dive()
        .find('[data-test-subj="graphFieldEditorDisable"]')
        .prop('checked')
    ).toEqual(true);
  });

  it('should enable field', () => {
    const secondFieldEditor = instance
      .find(FieldEditor)
      .at(1)
      .dive();
    expect(
      secondFieldEditor.find('[data-test-subj="graphFieldEditorDisable"]').prop('checked')
    ).toEqual(true);
    act(() => {
      secondFieldEditor.find('[data-test-subj="graphFieldEditorDisable"]').prop('onChange')!(
        {} as React.MouseEvent
      );
    });

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'x-pack/graph/fields/UPDATE_FIELD_PROPERTIES',
      payload: {
        fieldName: 'field2',
        fieldProperties: {
          hopSize: 5,
          lastValidHopSize: 0,
        },
      },
    });

    update();

    expect(
      instance
        .find(FieldEditor)
        .at(0)
        .dive()
        .find('[data-test-subj="graphFieldEditorDisable"]')
        .prop('checked')
    ).toEqual(false);
  });

  it('should update color', () => {
    act(() => {
      instance
        .find(FieldEditor)
        .at(1)
        .dive()
        .find(EuiColorPicker)
        .prop('onChange')('#ddd');
    });

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'x-pack/graph/fields/UPDATE_FIELD_PROPERTIES',
      payload: {
        fieldName: 'field2',
        fieldProperties: {
          color: '#ddd',
        },
      },
    });
  });
});
