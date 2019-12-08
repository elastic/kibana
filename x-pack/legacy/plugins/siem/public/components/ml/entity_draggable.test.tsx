/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import toJson from 'enzyme-to-json';
import { shallow, mount } from 'enzyme';
import { EntityDraggableComponent } from './entity_draggable';
import { TestProviders } from '../../mock/test_providers';

describe('entity_draggable', () => {
  let root: HTMLElement;

  // https://github.com/atlassian/react-beautiful-dnd/issues/1593
  beforeEach(() => {
    root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.removeChild(root);
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <EntityDraggableComponent
        idPrefix="id-prefix"
        entityName="entity-name"
        entityValue="entity-value"
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('renders with entity name with entity value as text', () => {
    const wrapper = mount(
      <TestProviders>
        <EntityDraggableComponent
          idPrefix="id-prefix"
          entityName="entity-name"
          entityValue="entity-value"
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('entity-name: "entity-value"');
  });
});
