/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { contentListKeys, contentListQueryClient } from '@kbn/content-list-provider';
import { RULES_CONTENT_LIST_ID } from '../constants';
import { ruleKeys } from './query_key_factory';
import {
  invalidateRulesContentList,
  invalidateRulesListView,
  invalidateRulesTagsFacet,
} from './invalidate_rules_content_list';

vi.mock('@kbn/content-list-provider', () => {
      const mocked = {
      contentListKeys: { all: vi.fn((id: string) => ['contentList', id]) },
      contentListQueryClient: { invalidateQueries: vi.fn().mockResolvedValue(undefined) },
    };
      return { ...mocked, default: mocked };
    });

const mockInvalidateQueries = contentListQueryClient.invalidateQueries as Mock;

describe('invalidateRulesContentList helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidateRulesListView invalidates the Content List scope for the rules list', async () => {
    await invalidateRulesListView();

    expect(contentListKeys.all).toHaveBeenCalledWith(RULES_CONTENT_LIST_ID);
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['contentList', RULES_CONTENT_LIST_ID],
    });
  });

  it('invalidateRulesTagsFacet invalidates the shared rule tags key', async () => {
    await invalidateRulesTagsFacet();

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ruleKeys.allTags() });
  });

  it('invalidateRulesContentList invalidates both the list and the tags facet', async () => {
    await invalidateRulesContentList();

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['contentList', RULES_CONTENT_LIST_ID],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ruleKeys.allTags() });
  });
});
