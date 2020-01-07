/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import toJson from 'enzyme-to-json';
import { shallow } from 'enzyme';
import { EntityDraggableComponent } from './entity_draggable';
import { TestProviders } from '../../mock/test_providers';
import { useMountAppended } from '../../utils/use_mount_appended';

describe('entity_draggable', () => {
  const mount = useMountAppended();

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <EntityDraggableComponent
        entityName="entity-name"
        entityValue="entity-value"
        idPrefix="id-prefix"
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('renders with entity name with entity value as text', () => {
    const wrapper = mount(
      <TestProviders>
        <EntityDraggableComponent
          entityName="entity-name"
          entityValue="entity-value"
          idPrefix="id-prefix"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('entity-name: "entity-value"');
  });
});
