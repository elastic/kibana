/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StatementListHeading } from './statement_list_heading';
import { shallow } from 'enzyme';

describe('StatementListHeading component', () => {
  let props;

  beforeEach(() => {
    props = {
      iconType: 'logstashInput',
      title: 'Filters',
    };
  });

  it('renders title and icon type', () => {
    expect(shallow(<StatementListHeading {...props} />)).toMatchSnapshot();
  });
});
