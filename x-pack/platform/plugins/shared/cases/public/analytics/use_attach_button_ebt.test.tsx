/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  CASE_VIEW_ATTACH_BUTTON_CLICKED_EVENT_TYPE,
  CASE_VIEW_ATTACH_MENU_ITEM_CLICKED_EVENT_TYPE,
  SECURITY_SOLUTION_OWNER,
} from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { useAttachButtonClickedEBT, useAttachMenuItemClickedEBT } from './use_attach_button_ebt';

jest.mock('../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../components/cases_context/use_cases_context', () => ({
  useCasesContext: jest.fn(),
}));

const getMockServices = (reportEvent: jest.Mock) => ({
  services: {
    analytics: {
      reportEvent,
    },
  },
});

describe('attach button EBT hooks', () => {
  const reportEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue(getMockServices(reportEvent));
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [SECURITY_SOLUTION_OWNER] });
  });

  describe('useAttachButtonClickedEBT', () => {
    it('reports the attach location with the owner', () => {
      const { result } = renderHook(() => useAttachButtonClickedEBT());

      result.current('attachments');

      expect(reportEvent).toHaveBeenCalledWith(CASE_VIEW_ATTACH_BUTTON_CLICKED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        attach_location: 'attachments',
      });
    });

    it('falls back to unknown owner', () => {
      (useCasesContext as jest.Mock).mockReturnValue({ owner: ['invalid'] });
      const { result } = renderHook(() => useAttachButtonClickedEBT());

      result.current('activity');

      expect(reportEvent).toHaveBeenCalledWith(CASE_VIEW_ATTACH_BUTTON_CLICKED_EVENT_TYPE, {
        owner: 'unknown',
        attach_location: 'activity',
      });
    });
  });

  describe('useAttachMenuItemClickedEBT', () => {
    it('reports the selected attachment type with the owner', () => {
      const { result } = renderHook(() => useAttachMenuItemClickedEBT());

      result.current('saved_object');

      expect(reportEvent).toHaveBeenCalledWith(CASE_VIEW_ATTACH_MENU_ITEM_CLICKED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        attachment_type: 'saved_object',
      });
    });
  });
});
