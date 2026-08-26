/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { LENS_ATTACHMENT_TYPE, LENS_SO_TYPE } from '../../../../../common/constants/attachments';
import {
  getLensByRefAttachment,
  getLensByValueAttachment,
  getLensLibrarySavedObjectId,
} from './utils';
import { getMockLensApi, mockLensAttributes } from './mocks';

describe('utils', () => {
  describe('getLensByValueAttachment', () => {
    it('create a case lens attachment correctly', () => {
      const embeddable = { attributes: {}, timeRange: {} };

      // @ts-expect-error: extra attributes are not needed
      expect(getLensByValueAttachment(embeddable)).toMatchInlineSnapshot(`
        Object {
          "data": Object {
            "state": Object {
              "attributes": Object {},
              "metadata": undefined,
              "timeRange": Object {},
            },
          },
          "type": "lens",
        }
      `);
    });
  });

  describe('getLensByRefAttachment', () => {
    it('returns a by-ref payload', () => {
      const timeRange = { from: 'now-24h', to: 'now' };

      expect(
        getLensByRefAttachment({
          attributes: mockLensAttributes,
          timeRange,
          savedObjectId: 'lens-1',
        })
      ).toEqual({
        type: LENS_ATTACHMENT_TYPE,
        attachmentId: 'lens-1',
        metadata: { title: 'mockTitle', soType: LENS_SO_TYPE },
        data: { attributes: mockLensAttributes, timeRange },
      });
    });

    it('uses title fallback when attributes.title is missing', () => {
      const attributes = { ...mockLensAttributes, title: '' };

      expect(
        getLensByRefAttachment({
          attributes,
          timeRange: { from: 'now-24h', to: 'now' },
          savedObjectId: 'lens-1',
          title: 'panel title',
        })
      ).toEqual(
        expect.objectContaining({
          metadata: { title: 'panel title', soType: LENS_SO_TYPE },
        })
      );
    });

    it('omits data when the snapshot exceeds the budget', () => {
      const attributes = {
        ...mockLensAttributes,
        title: 'oversized',
        blob: 'x'.repeat(200_001),
      };

      expect(
        getLensByRefAttachment({
          attributes,
          timeRange: { from: 'now-24h', to: 'now' },
          savedObjectId: 'lens-1',
        })
      ).toEqual({
        type: LENS_ATTACHMENT_TYPE,
        attachmentId: 'lens-1',
        metadata: { title: 'oversized', soType: LENS_SO_TYPE },
      });
    });
  });

  describe('getLensLibrarySavedObjectId', () => {
    it('reads savedObjectId$ first', () => {
      const api = getMockLensApi(undefined, {
        savedObjectId$: new BehaviorSubject<string | undefined>('from-subject'),
      });

      expect(getLensLibrarySavedObjectId(api)).toBe('from-subject');
    });

    it('falls back to serializeState.ref_id', () => {
      const api = getMockLensApi(undefined, {
        serializeState: () => ({ ref_id: 'from-serialize' } as never),
      });

      expect(getLensLibrarySavedObjectId(api)).toBe('from-serialize');
    });

    it('falls back to legacy savedObjectId', () => {
      const api = getMockLensApi(undefined, {
        getLegacySerializedState: () => ({ savedObjectId: 'from-legacy' } as never),
      });

      expect(getLensLibrarySavedObjectId(api)).toBe('from-legacy');
    });

    it('returns undefined for an ad-hoc panel', () => {
      expect(getLensLibrarySavedObjectId(getMockLensApi())).toBeUndefined();
    });

    it('ignores empty and whitespace ids', () => {
      const api = getMockLensApi(undefined, {
        savedObjectId$: new BehaviorSubject<string | undefined>('   '),
      });

      expect(getLensLibrarySavedObjectId(api)).toBeUndefined();
    });
  });
});
