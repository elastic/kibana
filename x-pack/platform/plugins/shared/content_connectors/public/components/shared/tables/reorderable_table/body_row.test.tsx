/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut, EuiToken } from '@elastic/eui';

import { BodyRow } from './body_row';
import { Cell } from './cell';

interface Foo {
  id: number;
}

describe('BodyRow', () => {
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

  it('renders a table row from the provided item and columns', () => {
    const wrapper = shallow(<BodyRow columns={columns} item={item} />);
    const cells = wrapper.find(Cell);

    expect(cells.length).toBe(2);
    expect(cells.at(0).props()).toEqual({
      alignItems: 'bar',
      children: 1,
      flexBasis: 'foo',
      flexGrow: 0,
    });
    expect(cells.at(1).props()).toEqual({
      children: 'Whatever',
    });
  });

  it('will accept additional properties to apply to this row', () => {
    const wrapper = shallow(
      <BodyRow
        columns={columns}
        item={item}
        additionalProps={{
          className: 'some_class_name',
        }}
      />
    );

    expect(wrapper.find('[data-test-subj="row"]').hasClass('some_class_name')).toBe(true);
  });

  it('will render an additional cell in the first column if one is provided', () => {
    const wrapper = shallow(
      <BodyRow columns={columns} item={item} leftAction={<div>Left Action</div>} />
    );
    const cells = wrapper.find(Cell);

    expect(cells.length).toBe(3);
    expect(cells.at(0).html()).toContain('Left Action');
  });

  it('will render a row identifier if one is provided', () => {
    const wrapper = shallow(<BodyRow columns={columns} item={item} rowIdentifier="21" />);
    const cells = wrapper.find(Cell);

    expect(cells.length).toBe(3);
    expect(cells.at(0).find(EuiToken)).toHaveLength(1);
  });

  it('will render row errors', () => {
    const wrapper = shallow(
      <BodyRow columns={columns} item={item} errors={['first error', 'second error']} />
    );
    const callouts = wrapper.find(EuiCallOut);

    expect(callouts.length).toBe(2);
    expect(callouts.at(0).prop('title')).toEqual('first error');
    expect(callouts.at(1).prop('title')).toEqual('second error');
  });
});
