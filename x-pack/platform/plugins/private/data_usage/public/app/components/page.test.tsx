/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { TestProvider } from '../../../common/test_utils';
import { render, type RenderResult } from '@testing-library/react';
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
          <DataUsagePage data-test-subj={testId} {...props} />
        </TestProvider>
      );
  });

  it('renders', () => {
    const { getByTestId } = renderComponent({ title: 'test' });
    expect(getByTestId(`${testId}-header`)).toBeTruthy();
  });

  it('should show page title', () => {
    const { getByTestId } = renderComponent({ title: 'test header' });
    expect(getByTestId(`${testId}-title`)).toBeTruthy();
    expect(getByTestId(`${testId}-title`)).toHaveTextContent('test header');
  });

  it('should show page description', () => {
    const { getByTestId } = renderComponent({ title: 'test', subtitle: 'test description' });
    expect(getByTestId(`${testId}-description`)).toBeTruthy();
    expect(getByTestId(`${testId}-description`)).toHaveTextContent('test description');
  });
});
