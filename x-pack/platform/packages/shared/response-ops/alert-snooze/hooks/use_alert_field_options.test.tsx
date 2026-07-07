/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { useFetchAlertsFieldsQuery } from '@kbn/alerts-ui-shared/src/common/hooks/use_fetch_alerts_fields_query';
import { useAlertFieldOptions } from './use_alert_field_options';

jest.mock('@kbn/alerts-ui-shared/src/common/hooks/use_fetch_alerts_fields_query');
const mockUseFetchAlertsFieldsQuery = useFetchAlertsFieldsQuery as jest.Mock;

const http = httpServiceMock.createStartContract();

describe('useAlertFieldOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps fetched fields to leaf scalar combobox options', () => {
    mockUseFetchAlertsFieldsQuery.mockReturnValue({
      data: {
        browserFields: {},
        fields: [
          { name: 'kibana.alert.status', type: 'keyword', esTypes: ['keyword'] },
          { name: 'kibana.alert.rule.parameters', type: 'object', esTypes: ['object'] },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useAlertFieldOptions({ http, ruleTypeIds: ['.es-query'] }));

    expect(result.current.fieldOptions).toEqual([
      { label: 'kibana.alert.status', value: 'kibana.alert.status' },
    ]);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns an empty option set while there is no data', () => {
    mockUseFetchAlertsFieldsQuery.mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useAlertFieldOptions({ http, ruleTypeIds: ['.es-query'] }));

    expect(result.current.fieldOptions).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('disables the query when there are no rule type ids', () => {
    mockUseFetchAlertsFieldsQuery.mockReturnValue({ data: undefined, isLoading: false });

    renderHook(() => useAlertFieldOptions({ http, ruleTypeIds: [] }));

    expect(mockUseFetchAlertsFieldsQuery).toHaveBeenCalledWith(
      { http, ruleTypeIds: [] },
      expect.objectContaining({ enabled: false })
    );
  });

  it('respects an explicit enabled=false override', () => {
    mockUseFetchAlertsFieldsQuery.mockReturnValue({ data: undefined, isLoading: false });

    renderHook(() => useAlertFieldOptions({ http, ruleTypeIds: ['.es-query'], enabled: false }));

    expect(mockUseFetchAlertsFieldsQuery).toHaveBeenCalledWith(
      { http, ruleTypeIds: ['.es-query'] },
      expect.objectContaining({ enabled: false })
    );
  });
});
