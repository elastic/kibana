/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { MAX_STATE_STRING_LENGTH, appDocumentSchema } from '@kbn/custom-app-common';
import {
  EMPTY_VIEW,
  createView,
  decodeView,
  encodeView,
  getViewKeys,
  isSameView,
} from './view_state';

const DEFAULT_TIME = { from: 'now-24h', to: 'now' };

const document = appDocumentSchema.parse({
  state: {
    severity: { type: 'string', default: 'all' },
    limit: { type: 'number', default: 10 },
    compact: { type: 'boolean', default: false },
    reason: { type: 'string', default: '' },
  },
  root: {
    type: 'stack',
    id: 'root',
    children: [
      {
        type: 'form',
        id: 'ask',
        submitLabel: 'Send',
        fields: [{ bind: 'reason', kind: 'text', label: 'Reason' }],
      },
      { type: 'flyout', id: 'detail', title: 'Detail', children: [] },
    ],
  },
});

describe('the view of an app', () => {
  describe('which values are in it', () => {
    it('is every value of the app but what is typed in a form, which does not belong in a link', () => {
      expect(getViewKeys(document)).toEqual(['severity', 'limit', 'compact']);
    });
  });

  describe('creating it', () => {
    const create = (
      state: Record<string, string | number | boolean>,
      flyout?: string,
      timeRange = DEFAULT_TIME
    ) => createView(document, state, flyout, timeRange, DEFAULT_TIME);

    it('is empty for an app as it starts', () => {
      expect(create({ severity: 'all', limit: 10, compact: false, reason: '' })).toEqual(
        EMPTY_VIEW
      );
    });

    it('holds only what differs from how the app starts', () => {
      expect(create({ severity: 'high', limit: 10, compact: true, reason: '' }).values).toEqual({
        severity: 'high',
        compact: true,
      });
    });

    it('does not hold what is typed in a form, though it differs', () => {
      expect(create({ severity: 'all', limit: 10, compact: false, reason: 'secret' })).toEqual(
        EMPTY_VIEW
      );
    });

    it('holds the open flyout, and the period when it is not the one the app starts with', () => {
      expect(
        create({ severity: 'all', limit: 10, compact: false, reason: '' }, 'detail', {
          from: 'now-7d',
          to: 'now',
        })
      ).toEqual({ values: {}, flyout: 'detail', timeRange: { from: 'now-7d', to: 'now' } });
    });
  });

  describe('as a link', () => {
    it('is nothing for a view that is empty, so the link of an app as it starts is clean', () => {
      expect(encodeView(EMPTY_VIEW)).toBeUndefined();
    });

    it('comes back as it was', () => {
      const view = {
        values: { severity: 'high', limit: 25, compact: true },
        flyout: 'detail',
        timeRange: { from: 'now-7d', to: 'now' },
      };

      expect(decodeView(document, encodeView(view))).toEqual(view);
    });

    it('survives text that would break a link', () => {
      const view = { values: { severity: 'a&b=c d/é\'"' } };

      expect(decodeView(document, encodeView(view))).toEqual(view);
    });

    it('can be compared', () => {
      expect(isSameView({ values: { a: 1 } }, { values: { a: 1 } })).toBe(true);
      expect(isSameView({ values: { a: 1 } }, { values: { a: 2 } })).toBe(false);
      expect(isSameView({ values: {}, flyout: 'x' }, { values: {} })).toBe(false);
    });
  });

  describe('reading a link, which is whatever anyone typed', () => {
    const read = (value: unknown) => decodeView(document, encode(value));

    it('is no view when there is no link, or it cannot be read', () => {
      expect(decodeView(document, null)).toEqual(EMPTY_VIEW);
      expect(decodeView(document, '')).toEqual(EMPTY_VIEW);
      expect(decodeView(document, '(((')).toEqual(EMPTY_VIEW);
      expect(decodeView(document, encode('text'))).toEqual(EMPTY_VIEW);
      expect(decodeView(document, encode([1, 2]))).toEqual(EMPTY_VIEW);
    });

    it('does not read a link that is longer than one made here', () => {
      expect(decodeView(document, encode({ v: { severity: 'x'.repeat(5_000) } }))).toEqual(
        EMPTY_VIEW
      );
    });

    it('leaves out a value the app does not have, and one of the wrong type', () => {
      expect(read({ v: { severity: 'high', nope: 'x', limit: 'ten', compact: 1 } }).values).toEqual(
        { severity: 'high' }
      );
    });

    it('leaves out a value that is too long', () => {
      expect(read({ v: { severity: 'x'.repeat(MAX_STATE_STRING_LENGTH + 1) } }).values).toEqual({});
    });

    it('leaves out what a form holds, even when the link carries it', () => {
      expect(read({ v: { reason: 'smuggled' } }).values).toEqual({});
    });

    it('leaves out a flyout the app does not have', () => {
      expect(read({ f: 'detail' }).flyout).toBe('detail');
      expect(read({ f: 'nope' }).flyout).toBeUndefined();
      expect(read({ f: 5 }).flyout).toBeUndefined();
    });

    it('leaves out a period that cannot be understood, or is not text', () => {
      expect(read({ t: { from: 'now-7d', to: 'now' } }).timeRange).toEqual({
        from: 'now-7d',
        to: 'now',
      });
      expect(read({ t: { from: 'yesterday-ish', to: 'now' } }).timeRange).toBeUndefined();
      expect(read({ t: { from: 'now-7d' } }).timeRange).toBeUndefined();
      expect(read({ t: { from: 1, to: 2 } }).timeRange).toBeUndefined();
      expect(read({ t: { from: 'now-7d', to: 'x'.repeat(100) } }).timeRange).toBeUndefined();
    });

    it('keeps the good parts of a link that has bad ones', () => {
      expect(read({ v: { severity: 'high', nope: 1 }, f: 'nope', t: 'x' })).toEqual({
        values: { severity: 'high' },
      });
    });

    it('does not take a value off the prototype, or set one that is not its own', () => {
      const view = decodeView(document, '(v:(__proto__:(severity:high),constructor:x))');

      expect(view.values).toEqual({});
      expect(({} as Record<string, unknown>).severity).toBeUndefined();
    });
  });
});
