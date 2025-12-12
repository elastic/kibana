/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { BodyRows } from './body_rows';

const Row = <Item extends object>({ item, itemIndex }: { item: Item; itemIndex: number }) => (
  <div>
    {item as React.ReactNode} {itemIndex}
  </div>
);

describe('BodyRows', () => {
  it('renders a row for each provided item', () => {
    const wrapper = shallow(
      <BodyRows
        items={[{ id: 1 }, { id: 2 }]}
        renderItem={(item, itemIndex) => <Row item={item} itemIndex={itemIndex} key={itemIndex} />}
      />
    );
    const rows = wrapper.find(Row);
    expect(rows.length).toBe(2);

    expect(rows.at(0).props()).toEqual({
      itemIndex: 0,
      item: { id: 1 },
    });

    expect(rows.at(1).props()).toEqual({
      itemIndex: 1,
      item: { id: 2 },
    });
  });
});
