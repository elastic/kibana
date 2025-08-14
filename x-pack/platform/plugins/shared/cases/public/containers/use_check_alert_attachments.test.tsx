/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useCheckAlertAttachments } from './use_check_alert_attachments';
import type { CaseUI } from './types';
import type { GetAttachments } from '../components/all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import type { CaseAttachmentWithoutOwner } from '../types';

const mkCase = (id: string) => ({ id } as unknown as CaseUI);

// Returns [] for cases in emptyIds; returns a single dummy attachment otherwise
const makeGetAttachments =
  (emptyIds: Set<string>): GetAttachments =>
  ({ theCase }) => {
    if (!theCase) {
      // Simulate non-empty attachments when opened (not used by hook logic directly)
      return [{} as unknown as CaseAttachmentWithoutOwner];
    }
    return emptyIds.has(theCase.id) ? [] : [{} as unknown as CaseAttachmentWithoutOwner];
  };

describe('useCheckAlertAttachments (simplified)', () => {
  it('returns an empty Set when getAttachments is not provided', () => {
    const { result } = renderHook(() =>
      useCheckAlertAttachments({ cases: [mkCase('a'), mkCase('b')] })
    );

    expect(result.current).toBeInstanceOf(Set);
    expect(result.current.size).toBe(0);
  });

  it('includes case ids where getAttachments returns an empty array', () => {
    const cases = [mkCase('a'), mkCase('b'), mkCase('c')];
    const getAttachments = makeGetAttachments(new Set(['b']));

    const { result } = renderHook(() => useCheckAlertAttachments({ cases, getAttachments }));

    expect([...result.current]).toEqual(['b']);
  });
});
