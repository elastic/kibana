/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import mockAnnotations from '../annotations_table/__mocks__/mock_annotations.json';

import moment from 'moment-timezone';
import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

import { AnnotationDescriptionList } from '.';

describe('AnnotationDescriptionList', () => {
  beforeEach(() => {
    moment.tz.setDefault('UTC');
  });
  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  test('Initialization with annotation.', () => {
    // @ts-expect-error mock data is too loosely typed
    const wrapper = shallowWithIntl(<AnnotationDescriptionList annotation={mockAnnotations[0]} />);
    expect(wrapper).toMatchSnapshot();
  });
});
