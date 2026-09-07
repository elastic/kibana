/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { useKibana } from '../../../../../common/lib/kibana';
import { useLinkedObject } from './use_linked_object';
import { getSLOLinkData } from './get_link_data/get_slo_link_data';
import type { Rule } from '../../../../../types';

jest.mock('../../../../../common/lib/kibana');
jest.mock('./get_link_data/get_slo_link_data');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockGetSLOLinkData = getSLOLinkData as jest.MockedFunction<typeof getSLOLinkData>;

describe('useLinkedObject', () => {
  const mockLocator = {
    getRedirectUrl: jest.fn(),
  };

  const mockServices = {
    share: {
      url: {
        locators: {
          get: jest.fn(),
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: mockServices,
    } as any);
  });

  describe('when rule type is not supported', () => {
    it('should return null linkUrl and empty buttonText for undefined rule', () => {
      const { result } = renderHook(() => useLinkedObject({ rule: undefined }));

      expect(result.current).toEqual({
        linkUrl: null,
        buttonText: '',
      });
    });

    it('should return null linkUrl and empty buttonText for unsupported rule type', () => {
      const rule = {
        id: 'test-rule-id',
        ruleTypeId: 'unsupported-rule-type',
        name: 'Test Rule',
      } as Rule;

      const { result } = renderHook(() => useLinkedObject({ rule }));

      expect(result.current).toEqual({
        linkUrl: null,
        buttonText: '',
      });
      expect(mockGetSLOLinkData).not.toHaveBeenCalled();
    });
  });

  describe('when rule type is SLO_BURN_RATE_RULE_TYPE_ID', () => {
    const sloBurnRateRule = {
      id: 'slo-rule-id',
      ruleTypeId: SLO_BURN_RATE_RULE_TYPE_ID,
      name: 'SLO Burn Rate Rule',
      enabled: true,
      tags: [],
      consumer: 'alerts',
      schedule: { interval: '1m' },
      actions: [],
      params: {
        sloId: 'test-slo-id',
      },
      createdBy: 'user',
      updatedBy: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      throttle: null,
      notifyWhen: null,
      muteAll: false,
      mutedInstanceIds: [],
      executionStatus: { status: 'ok', lastExecutionDate: new Date() },
      monitoring: {
        run: { status: 'ok', lastExecutionDate: new Date() },
        history: [],
        calculated_metrics: {},
        last_run: {},
      },
      apiKeyOwner: null,
      revision: 1,
      snoozeSchedule: [],
      isSnoozedUntil: null,
      meta: {},
      systemActions: [],
      alertTypeId: SLO_BURN_RATE_RULE_TYPE_ID,

      // add any additional minimal fields as needed
    } as unknown as Rule;

    it('should return null when urlParams is undefined', () => {
      mockGetSLOLinkData.mockReturnValue({
        urlParams: undefined,
        buttonText: 'View SLO',
        locatorId: 'SLO_LOCATOR',
      });

      // sloBurnRateRule should match the minimal required shape of Rule for type safety
      // `monitoring` needs to contain fields history, calculated_metrics, last_run for type safety.

      const { result } = renderHook(() => useLinkedObject({ rule: sloBurnRateRule }));

      expect(mockGetSLOLinkData).toHaveBeenCalledWith(sloBurnRateRule);
      expect(result.current).toEqual({
        linkUrl: null,
        buttonText: '',
      });
    });

    it('should return null when locator is not found', () => {
      mockGetSLOLinkData.mockReturnValue({
        urlParams: { sloId: 'test-slo-id' },
        buttonText: 'View SLO',
        locatorId: 'SLO_LOCATOR',
      });
      mockServices.share.url.locators.get.mockReturnValue(undefined);

      const { result } = renderHook(() => useLinkedObject({ rule: sloBurnRateRule }));

      expect(mockGetSLOLinkData).toHaveBeenCalledWith(sloBurnRateRule);
      expect(mockServices.share.url.locators.get).toHaveBeenCalledWith('SLO_LOCATOR');
      expect(result.current).toEqual({
        linkUrl: null,
        buttonText: '',
      });
    });

    it('should return linkUrl and buttonText when urlParams and locator exist', () => {
      const mockUrlParams = { sloId: 'test-slo-id' };
      const mockButtonText = 'View SLO';
      const mockLocatorId = 'SLO_LOCATOR';
      const mockRedirectUrl = '/app/slo/test-slo-id';

      mockGetSLOLinkData.mockReturnValue({
        urlParams: mockUrlParams,
        buttonText: mockButtonText,
        locatorId: mockLocatorId,
      });
      mockServices.share.url.locators.get.mockReturnValue(mockLocator);
      mockLocator.getRedirectUrl.mockReturnValue(mockRedirectUrl);

      const { result } = renderHook(() => useLinkedObject({ rule: sloBurnRateRule }));

      expect(mockGetSLOLinkData).toHaveBeenCalledWith(sloBurnRateRule);
      expect(mockServices.share.url.locators.get).toHaveBeenCalledWith(mockLocatorId);
      expect(mockLocator.getRedirectUrl).toHaveBeenCalledWith(mockUrlParams);
      expect(result.current).toEqual({
        linkUrl: mockRedirectUrl,
        buttonText: mockButtonText,
      });
    });

    it('should return null when locatorId is empty string', () => {
      mockGetSLOLinkData.mockReturnValue({
        urlParams: { sloId: 'test-slo-id' },
        buttonText: 'View SLO',
        locatorId: '',
      });

      const { result } = renderHook(() => useLinkedObject({ rule: sloBurnRateRule }));

      expect(mockGetSLOLinkData).toHaveBeenCalledWith(sloBurnRateRule);
      expect(mockServices.share.url.locators.get).not.toHaveBeenCalled();
      expect(result.current).toEqual({
        linkUrl: null,
        buttonText: '',
      });
    });
  });
});
