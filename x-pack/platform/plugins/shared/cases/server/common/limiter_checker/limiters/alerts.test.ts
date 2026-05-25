/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAttachmentServiceMock } from '../../../services/mocks';
import { AlertLimiter } from './alerts';
import { createAlertRequests, createUnifiedAlertRequests, createUserRequests } from '../test_utils';

describe('AlertLimiter', () => {
  const attachmentService = createAttachmentServiceMock();
  attachmentService.countAlertsWithinCase.mockResolvedValue(5);

  const alert = new AlertLimiter(attachmentService);

  beforeEach(() => {
    jest.clearAllMocks();
    attachmentService.countAlertsWithinCase.mockResolvedValue(5);
  });

  describe('public fields', () => {
    it('sets the errorMessage to the 1k limit', () => {
      expect(alert.errorMessage).toMatchInlineSnapshot(
        `"Case has reached the maximum allowed number (1000) of attached alerts."`
      );
    });

    it('sets the limit to 1k', () => {
      expect(alert.limit).toBe(1000);
    });
  });

  describe('countOfItemsInRequest', () => {
    it('returns 0 when passed an empty array', () => {
      expect(alert.countOfItemsInRequest([])).toBe(0);
    });

    it('returns 0 when the requests are not for alerts', () => {
      expect(alert.countOfItemsInRequest(createUserRequests(2))).toBe(0);
    });

    it('returns 2 when there are 2 alert requests', () => {
      expect(alert.countOfItemsInRequest(createAlertRequests(2, 'alert-id'))).toBe(2);
    });

    it('returns 2 when there is 1 request with 2 alert ids', () => {
      expect(alert.countOfItemsInRequest(createAlertRequests(1, ['alert-id', 'alert-id2']))).toBe(
        2
      );
    });

    it('returns 3 when there is 1 request with 2 alert ids and 1 request with 1 alert id', () => {
      const requestWith2AlertIds = createAlertRequests(1, ['alert-id', 'alert-id2']);
      const requestWith1AlertId = createAlertRequests(1, 'alert-id');
      expect(alert.countOfItemsInRequest([...requestWith2AlertIds, ...requestWith1AlertId])).toBe(
        3
      );
    });

    it('returns 2 when there are 2 requests with an alert id and 1 user comment request', () => {
      expect(
        alert.countOfItemsInRequest([
          ...createUserRequests(1),
          ...createAlertRequests(2, 'alert-id'),
        ])
      ).toBe(2);
    });

    it('counts unified alert attachments', () => {
      expect(
        alert.countOfItemsInRequest(createUnifiedAlertRequests(1, ['unified-1', 'unified-2']))
      ).toBe(2);
    });

    it('aggregates legacy and unified alerts in the same request batch', () => {
      const requests = [
        ...createUserRequests(1),
        ...createAlertRequests(1, ['legacy-1', 'legacy-2']), // 2
        ...createAlertRequests(2, 'legacy-3'), // 2 (1 each)
        ...createUnifiedAlertRequests(1, ['unified-1', 'unified-2', 'unified-3']), // 3
        ...createUnifiedAlertRequests(2, 'unified-4'), // 2 (1 each)
      ];
      expect(alert.countOfItemsInRequest(requests)).toBe(2 + 2 + 3 + 2);
    });
  });

  describe('countOfItemsWithinCase', () => {
    it('delegates to attachmentService.countAlertsWithinCase with the case id', async () => {
      await alert.countOfItemsWithinCase('id');

      expect(attachmentService.countAlertsWithinCase).toHaveBeenCalledTimes(1);
      expect(attachmentService.countAlertsWithinCase).toHaveBeenCalledWith('id');
    });

    it('returns the count from the service (covers legacy + unified totals)', async () => {
      attachmentService.countAlertsWithinCase.mockResolvedValueOnce(7);
      expect(await alert.countOfItemsWithinCase('id')).toBe(7);
    });

    it('returns 0 when the service returns 0 (no legacy nor unified alerts)', async () => {
      attachmentService.countAlertsWithinCase.mockResolvedValueOnce(0);
      expect(await alert.countOfItemsWithinCase('id')).toBe(0);
    });
  });
});
