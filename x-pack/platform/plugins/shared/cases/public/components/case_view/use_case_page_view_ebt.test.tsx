/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useCasePageViewEbt } from './use_case_page_view_ebt';
import { CASE_PAGE_VIEW_EVENT_TYPE, OBSERVABILITY_OWNER } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../cases_context/use_cases_context';

// Mocks
vi.mock('../../common/lib/kibana', () => {
  const mocked = {
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../cases_context/use_cases_context', () => {
  const mocked = {
    useCasesContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const getMockServices = (reportEvent: Mock) => ({
  services: {
    analytics: {
      reportEvent,
    },
  },
});

describe('useCasePageViewEbt', () => {
  it('reports analytics event with valid owner', () => {
    const reportEvent = vi.fn();
    (useKibana as Mock).mockReturnValue(getMockServices(reportEvent));
    (useCasesContext as Mock).mockReturnValue({ owner: [OBSERVABILITY_OWNER] });

    renderHook(() => useCasePageViewEbt());

    expect(reportEvent).toHaveBeenCalledWith(CASE_PAGE_VIEW_EVENT_TYPE, {
      owner: OBSERVABILITY_OWNER,
    });
  });

  it('reports analytics event with invalid owner', () => {
    const reportEvent = vi.fn();
    (useKibana as Mock).mockReturnValue(getMockServices(reportEvent));
    (useCasesContext as Mock).mockReturnValue({ owner: ['invalid'] });

    renderHook(() => useCasePageViewEbt());

    expect(reportEvent).toHaveBeenCalledWith(CASE_PAGE_VIEW_EVENT_TYPE, {
      owner: 'unknown',
    });
  });
});
