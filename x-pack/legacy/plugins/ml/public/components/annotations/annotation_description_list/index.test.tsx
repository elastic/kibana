/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mockAnnotations from '../annotations_table/__mocks__/mock_annotations.json';

import moment from 'moment-timezone';
import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { AnnotationDescriptionList } from './index';

describe('AnnotationDescriptionList', () => {
  beforeEach(() => {
    moment.tz.setDefault('UTC');
  });
  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  test('Initialization with annotation.', () => {
    const wrapper = shallowWithIntl(
      <AnnotationDescriptionList.WrappedComponent
        annotation={mockAnnotations[0]}
        intl={null as any}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
