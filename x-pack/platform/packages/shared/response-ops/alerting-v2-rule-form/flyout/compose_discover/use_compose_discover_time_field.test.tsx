/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { FormValues } from '../../form/types';
import { useResolveTimeField } from './use_resolve_time_field';
import { useComposeDiscoverTimeField } from './use_compose_discover_time_field';

const mockHttp = httpServiceMock.createStartContract();
const mockData = dataPluginMock.createStartContract();
const mockDataViews = dataViewPluginMocks.createStartContract();

jest.mock('../../form/contexts/rule_form_context', () => ({
  useRuleFormServices: () => ({ http: mockHttp, data: mockData, dataViews: mockDataViews }),
}));
jest.mock('./use_resolve_time_field');

const mockUseResolveTimeField = jest.mocked(useResolveTimeField);

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const methods = useForm<FormValues>({
    defaultValues: { query: { base: 'FROM my_dataset | KEEP message' }, timeField: 'event_time' },
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('useComposeDiscoverTimeField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseResolveTimeField.mockReturnValue({ timeFieldOptions: [], isTimeFieldResolved: true });
  });

  it('resolves time fields with ES|QL introspection so federated datasets are supported', () => {
    renderHook(() => useComposeDiscoverTimeField(), { wrapper: Wrapper });

    expect(mockUseResolveTimeField).toHaveBeenCalledWith(
      expect.objectContaining({
        timeField: 'event_time',
        http: mockHttp,
        dataViews: mockDataViews,
        search: mockData.search.search,
      })
    );
  });
});
