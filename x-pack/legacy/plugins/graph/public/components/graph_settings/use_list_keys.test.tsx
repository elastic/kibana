/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { useListKeys } from './use_list_keys';

describe('use_list_keys', () => {
  function ListingComponent({ items }: { items: object[] }) {
    const getListKey = useListKeys(items);
    return (
      <ul>
        {items.map((item, index) => (
          <li key={getListKey(item)}>{index}</li>
        ))}
      </ul>
    );
  }

  it('should assign unique ids to all keys', () => {
    const instance = mount(<ListingComponent items={[{}, {}, {}, {}, {}]} />);
    const ids = collectIds(instance);
    expect(ids.size).toEqual(5);
  });

  it('should keep the same ids on update', () => {
    const items = [{}, {}, {}, {}, {}];
    const instance = mount(<ListingComponent items={items} />);
    const ids = collectIds(instance);

    instance.setProps({
      items: [...items],
    });

    expect(instance.find('li').length).toEqual(5);
    instance.find('li').forEach(el => {
      expect(ids.has(el.key())).toEqual(true);
    });
  });

  it('should assign a new id to a newly added item', () => {
    const items = [{}, {}, {}, {}, {}];
    const instance = mount(<ListingComponent items={items} />);
    const ids = collectIds(instance);

    instance.setProps({
      items: [...items, {}],
    });

    expect(instance.find('li').length).toEqual(6);
    instance.find('li').forEach((el, index) => {
      if (index < 5) {
        expect(ids.has(el.key())).toEqual(true);
      } else {
        expect(ids.has(el.key())).toEqual(false);
      }
    });
  });

  it('should keep old ids stable if some items are deleted', () => {
    const items = [{}, {}, {}, {}, {}];
    const instance = mount(<ListingComponent items={items} />);
    const ids = collectIds(instance);

    const updatedItems = [...items];
    updatedItems.splice(2, 1);
    instance.setProps({
      items: updatedItems,
    });

    expect(instance.find('li').length).toEqual(4);
    instance.find('li').forEach(el => {
      expect(ids.has(el.key())).toEqual(true);
    });
  });
});

function collectIds(instance: ReactWrapper) {
  const ids = new Set<string>();
  instance.find('li').forEach(el => {
    ids.add(el.key());
  });
  return ids;
}
