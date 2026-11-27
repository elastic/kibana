/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type {
  ClaimItem,
  EntityItem,
  InvestigationItem,
  ItemKind,
  LinkItem,
  TaskItem,
  TimelineEventItem,
} from '../../../../common/investigations/types';
import { findItems } from '../../api/client';
import { investigationKeys } from '../../api/query_keys';
import { useInvestigationsServices } from '../../services';

const PAGE_SIZE = 100;

export const isEntityItem = (item: InvestigationItem): item is EntityItem => item.kind === 'entity';
export const isLinkItem = (item: InvestigationItem): item is LinkItem => item.kind === 'link';
export const isTaskItem = (item: InvestigationItem): item is TaskItem => item.kind === 'task';
export const isClaimItem = (item: InvestigationItem): item is ClaimItem => item.kind === 'claim';
export const isTimelineEventItem = (item: InvestigationItem): item is TimelineEventItem =>
  item.kind === 'timeline_event';

export interface AllItems<T> {
  items: T[];
  total: number;
  /** True when the record holds more items than `max`. */
  truncated: boolean;
}

/**
 * Every item of one kind, loaded page by page (the server serves at most 100 per page) up to
 * `max`. Lives under the record's items query key, so item mutations refresh it.
 */
export const useAllItems = <T extends InvestigationItem>(
  recordId: string,
  kind: ItemKind,
  isKind: (item: InvestigationItem) => item is T,
  max: number
) => {
  const { http } = useInvestigationsServices();

  return useQuery(
    [...investigationKeys.itemsAll(recordId), 'all', kind, max],
    async (): Promise<AllItems<T>> => {
      const items: T[] = [];
      let total = 0;
      let page = 1;
      while (items.length < max) {
        const response = await findItems(http, recordId, {
          kind: [kind],
          per_page: PAGE_SIZE,
          page,
          sort_field: 'ref_num',
          sort_order: 'asc',
        });
        total = response.total;
        items.push(...response.items.filter(isKind));
        if (response.items.length < PAGE_SIZE || page * PAGE_SIZE >= total) {
          break;
        }
        page += 1;
      }
      return { items: items.slice(0, max), total, truncated: total > max };
    },
    { enabled: recordId.length > 0, keepPreviousData: true, retry: false }
  );
};
