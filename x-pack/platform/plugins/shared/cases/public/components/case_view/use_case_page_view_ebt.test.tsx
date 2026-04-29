/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useCasePageViewEbt } from './use_case_page_view_ebt';
import { CASE_PAGE_VIEW_EVENT_TYPE, OBSERVABILITY_OWNER } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../cases_context/use_cases_context';

// Mocks
jest.mock('../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../cases_context/use_cases_context', () => ({
  useCasesContext: jest.fn(),
}));

const getMockServices = (reportEvent: jest.Mock) => ({
  services: {
    analytics: {
      reportEvent,
    },
  },
});

describe('useCasePageViewEbt', () => {
  it('reports analytics event with valid owner', () => {
    const reportEvent = jest.fn();
    (useKibana as jest.Mock).mockReturnValue(getMockServices(reportEvent));
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [OBSERVABILITY_OWNER] });

    renderHook(() => useCasePageViewEbt());

    expect(reportEvent).toHaveBeenCalledWith(CASE_PAGE_VIEW_EVENT_TYPE, {
      owner: OBSERVABILITY_OWNER,
    });
  });

  it('reports analytics event with invalid owner', () => {
    const reportEvent = jest.fn();
    (useKibana as jest.Mock).mockReturnValue(getMockServices(reportEvent));
    (useCasesContext as jest.Mock).mockReturnValue({ owner: ['invalid'] });

    renderHook(() => useCasePageViewEbt());

    expect(reportEvent).toHaveBeenCalledWith(CASE_PAGE_VIEW_EVENT_TYPE, {
      owner: 'unknown',
    });
  });
});
