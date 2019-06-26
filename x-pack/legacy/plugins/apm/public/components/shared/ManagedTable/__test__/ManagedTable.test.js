/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ManagedTable } from '..';

describe('ManagedTable component', () => {
  let people;
  let columns;

  beforeEach(() => {
    people = [
      { name: 'Jess', age: 29 },
      { name: 'Becky', age: 43 },
      { name: 'Thomas', age: 31 }
    ];
    columns = [
      {
        field: 'name',
        name: 'Name',
        sortable: true,
        render: name => `Name: ${name}`
      },
      { field: 'age', name: 'Age', render: age => `Age: ${age}` }
    ];
  });

  it('should render a page-full of items, with defaults', () => {
    expect(
      shallow(<ManagedTable columns={columns} items={people} />)
    ).toMatchSnapshot();
  });

  it('should render when specifying initial values', () => {
    expect(
      shallow(
        <ManagedTable
          columns={columns}
          items={people}
          initialSort={{ field: 'age', direction: 'desc' }}
          initialPageIndex={1}
          initialPageSize={2}
          hidePerPageOptions={false}
        />
      )
    ).toMatchSnapshot();
  });
});
