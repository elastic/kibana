/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import jobConfig from '../../../../../common/types/__mocks__/job_config_farequote';
import mockAnnotations from './__mocks__/mock_annotations.json';
import './annotations_table.test.mocks';

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { AnnotationsTable } from './annotations_table';

jest.mock('ui/chrome', () => ({
  getBasePath: path => path,
  addBasePath: () => {},
}));

jest.mock('../../../services/job_service', () => ({
  mlJobService: {
    getJob: jest.fn(),
  },
}));

jest.mock('../../../services/ml_api_service', () => {
  const { of } = require('rxjs');
  const mockAnnotations$ = of({ annotations: [] });
  return {
    ml: {
      annotations: {
        getAnnotations: jest.fn().mockReturnValue(mockAnnotations$),
      },
    },
  };
});

describe('AnnotationsTable', () => {
  test('Minimal initialization without props.', () => {
    const wrapper = shallowWithIntl(<AnnotationsTable.WrappedComponent />);
    expect(wrapper).toMatchSnapshot();
  });

  test('Initialization with job config prop.', () => {
    const wrapper = shallowWithIntl(<AnnotationsTable.WrappedComponent jobs={[jobConfig]} />);
    expect(wrapper).toMatchSnapshot();
  });

  test('Initialization with annotations prop.', () => {
    const wrapper = shallowWithIntl(
      <AnnotationsTable.WrappedComponent annotations={mockAnnotations.slice(0, 1)} />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
