/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { Cell } from './cell';
import { HeaderRow } from './header_row';

interface Foo {
  id: number;
}

describe('HeaderRow', () => {
  const columns = [
    { name: 'ID', render: (item: Foo) => <div>{item.id}</div> },
    { name: 'Whatever', render: () => 'Whatever' },
  ];

  it('renders a table header row from the provided column names', () => {
    const wrapper = shallow(<HeaderRow columns={columns} />);
    const cells = wrapper.find(Cell);
    expect(cells.length).toBe(2);
    expect(cells.at(0).children().dive().text()).toEqual('ID');
    expect(cells.at(1).children().dive().text()).toEqual('Whatever');
  });

  it('will render an additional cell in the first column if one is provided', () => {
    const wrapper = shallow(<HeaderRow columns={columns} leftAction={<div>Left Action</div>} />);
    const cells = wrapper.find(Cell);
    expect(cells.length).toBe(3);
    expect(cells.at(0).html()).toContain('Left Action');
  });

  it('will add space for row identifiers', () => {
    const wrapper = shallow(<HeaderRow columns={columns} spacingForRowIdentifier />);
    const cells = wrapper.find(Cell);
    expect(cells.length).toBe(3);
    expect(cells.at(0).children()).toHaveLength(0);
  });
});
