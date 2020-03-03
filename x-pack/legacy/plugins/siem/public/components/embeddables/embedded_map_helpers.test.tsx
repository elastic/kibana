/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createEmbeddable, findMatchingIndexPatterns } from './embedded_map_helpers';
import { createUiNewPlatformMock } from 'ui/new_platform/__mocks__/helpers';
import { createPortalNode } from 'react-reverse-portal';
import {
  mockAPMIndexPattern,
  mockAPMRegexIndexPattern,
  mockAPMTransactionIndexPattern,
  mockAuditbeatIndexPattern,
  mockFilebeatIndexPattern,
  mockGlobIndexPattern,
} from './__mocks__/mock';

jest.mock('ui/new_platform');

const { npStart } = createUiNewPlatformMock();
npStart.plugins.embeddable.getEmbeddableFactory = jest.fn().mockImplementation(() => ({
  createFromState: () => ({
    reload: jest.fn(),
  }),
}));

describe('embedded_map_helpers', () => {
  describe('createEmbeddable', () => {
    test('attaches refresh action', async () => {
      const setQueryMock = jest.fn();
      await createEmbeddable(
        [],
        [],
        { query: '', language: 'kuery' },
        0,
        0,
        setQueryMock,
        createPortalNode(),
        npStart.plugins.embeddable
      );
      expect(setQueryMock).toHaveBeenCalledTimes(1);
    });

    test('attaches refresh action with correct reference', async () => {
      const setQueryMock = jest.fn(({ id, inspect, loading, refetch }) => refetch);
      const embeddable = await createEmbeddable(
        [],
        [],
        { query: '', language: 'kuery' },
        0,
        0,
        setQueryMock,
        createPortalNode(),
        npStart.plugins.embeddable
      );
      expect(setQueryMock.mock.calls[0][0].refetch).not.toBe(embeddable.reload);
      setQueryMock.mock.results[0].value();
      expect(embeddable.reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('findMatchingIndexPatterns', () => {
    const siemDefaultIndices = [
      'apm-*-transaction*',
      'auditbeat-*',
      'endgame-*',
      'filebeat-*',
      'packetbeat-*',
      'winlogbeat-*',
    ];

    test('finds exact matching index patterns ', () => {
      const matchingIndexPatterns = findMatchingIndexPatterns({
        kibanaIndexPatterns: [mockFilebeatIndexPattern, mockAuditbeatIndexPattern],
        siemDefaultIndices,
      });
      expect(matchingIndexPatterns).toEqual([mockFilebeatIndexPattern, mockAuditbeatIndexPattern]);
    });

    test('finds glob-matched index patterns ', () => {
      const matchingIndexPatterns = findMatchingIndexPatterns({
        kibanaIndexPatterns: [mockAPMIndexPattern, mockFilebeatIndexPattern],
        siemDefaultIndices,
      });
      expect(matchingIndexPatterns).toEqual([mockAPMIndexPattern, mockFilebeatIndexPattern]);
    });

    test('does not find glob-matched index pattern containing regex', () => {
      const matchingIndexPatterns = findMatchingIndexPatterns({
        kibanaIndexPatterns: [mockAPMRegexIndexPattern, mockFilebeatIndexPattern],
        siemDefaultIndices,
      });
      expect(matchingIndexPatterns).toEqual([mockFilebeatIndexPattern]);
    });

    test('finds exact glob-matched index patterns ', () => {
      const matchingIndexPatterns = findMatchingIndexPatterns({
        kibanaIndexPatterns: [mockAPMTransactionIndexPattern, mockFilebeatIndexPattern],
        siemDefaultIndices,
      });
      expect(matchingIndexPatterns).toEqual([
        mockAPMTransactionIndexPattern,
        mockFilebeatIndexPattern,
      ]);
    });

    test('finds glob-only index patterns ', () => {
      const matchingIndexPatterns = findMatchingIndexPatterns({
        kibanaIndexPatterns: [mockGlobIndexPattern, mockFilebeatIndexPattern],
        siemDefaultIndices,
      });
      expect(matchingIndexPatterns).toEqual([mockGlobIndexPattern, mockFilebeatIndexPattern]);
    });
  });
});
