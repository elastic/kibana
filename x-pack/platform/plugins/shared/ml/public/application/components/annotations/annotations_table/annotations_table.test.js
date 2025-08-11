/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import jobConfig from '../../../../../common/types/__mocks__/job_config_farequote.json';
import mockAnnotations from './__mocks__/mock_annotations.json';
import { AnnotationsTable } from './annotations_table';
import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

const mockAnnotationUpdatesService = {
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};

const mockReact = React;

jest.mock('../../../services/job_service', () => {
  const mockMlJobService = {
    getJob: jest.fn(),
  };
  return {
    mlJobServiceFactory: jest.fn().mockReturnValue(mockMlJobService),
  };
});

jest.mock('../../../services/ml_api_service', () => {
  const { of } = require('rxjs');
  const mockAnnotations$ = of({ annotations: [] });
  return {
    ml: {
      annotations: {
        getAnnotations$: jest.fn().mockReturnValue(mockAnnotations$),
      },
    },
  };
});

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiInMemoryTable: jest.fn().mockImplementation(({ items }) => {
      return mockReact.createElement(
        'div',
        { 'data-test-subj': 'mockEuiInMemoryTable' },
        `Mocked table with ${items?.length || 0} items`
      );
    }),
  };
});

const mockKibanaContext = {
  services: {
    mlServices: {
      mlApi: {},
    },
  },
};

// Mock withKibana HOC
jest.mock('@kbn/kibana-react-plugin/public', () => {
  return {
    withKibana: (Component) => {
      const EnhancedComponent = (props) => {
        return mockReact.createElement(Component, {
          ...props,
          kibana: mockKibanaContext,
          annotationUpdatesService: mockAnnotationUpdatesService,
        });
      };
      return EnhancedComponent;
    },
  };
});

describe('AnnotationsTable', () => {
  test('Minimal initialization without props.', () => {
    const { container } = renderWithI18n(<AnnotationsTable />);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('Initialization with job config prop.', () => {
    const { container } = renderWithI18n(<AnnotationsTable jobs={[jobConfig]} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('Initialization with annotations prop.', () => {
    const { container } = renderWithI18n(
      <AnnotationsTable annotations={mockAnnotations.slice(0, 1)} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
