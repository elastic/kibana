/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { getNestedProperty } from '../../../../../../common/utils/object_utils';
import { getFlattenedFields } from '../../../../common';

import { ExpandedRow } from './expanded_row';

describe('Transform: <ExpandedRow />', () => {
  test('Test against strings, objects and arrays.', () => {
    const source = {
      name: 'the-name',
      nested: {
        inner1: 'the-inner-1',
        inner2: 'the-inner-2',
      },
      arrayString: ['the-array-string-1', 'the-array-string-2'],
      arrayObject: [{ object1: 'the-object-1' }, { object2: 'the-objects-2' }],
    } as Record<string, any>;

    const flattenedSource = getFlattenedFields(source).reduce((p, c) => {
      p[c] = getNestedProperty(source, c);
      if (p[c] === undefined) {
        p[c] = source[`"${c}"`];
      }
      return p;
    }, {} as Record<string, any>);

    const props = {
      item: {
        _id: 'the-id',
        _source: flattenedSource,
      },
    };

    // Using a wrapping <div> element because shallow() would fail
    // with the Provider being the outer most component.
    const wrapper = shallow(<ExpandedRow {...props} />);

    expect(wrapper).toMatchSnapshot();
  });
});
