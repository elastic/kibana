/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { TestProvider } from '../../../common/test_utils';
import { render, type RenderResult } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { DataUsagePage, type DataUsagePageProps } from './page';

describe('Page Component', () => {
  const testId = 'test';
  let renderComponent: (props: DataUsagePageProps) => RenderResult;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    renderComponent = (props: DataUsagePageProps) =>
      render(
        <TestProvider>
          <MockAppHeaderProvider>
            <DataUsagePage data-test-subj={testId} {...props} />
          </MockAppHeaderProvider>
        </TestProvider>
      );
  });

  it('renders', () => {
    const { getByTestId } = renderComponent({ title: 'test' });
    expect(getByTestId(testId)).toBeTruthy();
    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toBeTruthy();
  });

  it('should show page title', () => {
    const { getByTestId } = renderComponent({ title: 'test header' });
    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('test header');
  });

  it('should show page description', () => {
    const { getByTestId } = renderComponent({ title: 'test', subtitle: 'test description' });
    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent('test description');
  });
});
