/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '../../../common/types/domain';
import { AttachmentType } from '../../../common';
import { createCasesClientMockArgs } from '../mocks';
import { getCasesByAlertID, getTags, getReporters, getCategories, getMetadata } from './get';
import { ALERT_GROUPING, TAGS } from '@kbn/rule-data-utils';

describe('get', () => {
  const clientArgs = createCasesClientMockArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCasesByAlertID', () => {
    it('throws with excess fields', async () => {
      await expect(
        getCasesByAlertID(
          // @ts-expect-error: excess attribute
          { options: { owner: 'cases', foo: 'bar' }, alertID: 'test-alert' },
          clientArgs
        )
      ).rejects.toThrow('invalid keys "foo"');
    });
  });

  describe('getTags', () => {
    it('throws with excess fields', async () => {
      // @ts-expect-error: excess attribute
      await expect(getTags({ owner: 'cases', foo: 'bar' }, clientArgs)).rejects.toThrow(
        'invalid keys "foo"'
      );
    });
  });

  describe('getReporters', () => {
    it('throws with excess fields', async () => {
      // @ts-expect-error: excess attribute
      await expect(getReporters({ owner: 'cases', foo: 'bar' }, clientArgs)).rejects.toThrow(
        'invalid keys "foo"'
      );
    });
  });

  describe('getCategories', () => {
    it('throws with excess fields', async () => {
      // @ts-expect-error: excess attribute
      await expect(getCategories({ owner: 'cases', foo: 'bar' }, clientArgs)).rejects.toThrow(
        'invalid keys "foo"'
      );
    });
  });

  describe('getMetadata', () => {
    it('aggregates metadata from alerts using tags and grouping', async () => {
      clientArgs.services.alertsService.getAlerts.mockResolvedValue({
        docs: [
          {
            _id: 'alert-1',
            _index: 'alerts-index',
            found: true,
            _source: {
              [TAGS]: ['tag-a', 'tag-b'],
              [ALERT_GROUPING]: {
                foo: 'bar',
                nested: { deep: 'value' },
              },
            },
          },
          {
            _id: 'alert-2',
            _index: 'alerts-index',
            found: true,
            _source: {
              [TAGS]: ['tag-a', 'tag-c'],
              [ALERT_GROUPING]: {
                foo: 'foo',
                nested: { deep: 'value' },
              },
            },
          },
        ],
      });

      const res = await getMetadata(
        {
          comments: [
            {
              type: AttachmentType.alert,
              alertId: 'alert-1',
              index: 'alerts-index',
            } as unknown as Attachment,
            {
              type: AttachmentType.alert,
              alertId: 'alert-2',
              index: 'alerts-index',
            } as unknown as Attachment,
          ],
        },
        clientArgs
      );

      expect(res.tags).toEqual(['tag-a', 'tag-b', 'tag-c']);
      expect(res.foo).toEqual(['bar', 'foo']);
      expect(res['nested.deep']).toEqual(['value']);
    });
  });
});
