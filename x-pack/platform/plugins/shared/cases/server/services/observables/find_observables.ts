/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { z, lazySchema } from '@kbn/zod/v4';
import type { FindObservablesSortField, FindObservablesSortOrder } from '../../../common/types/api';
import type { Observable } from '../../../common/types/domain';
import type { ObservableDocument } from './observables_index';

/** The fields of an observable document that each sort field of the API orders by. */
const SORT_FIELD_TO_DOCUMENT_FIELD = {
  created: 'created_at',
  updated: 'updated_at',
  value: 'value',
  type: 'type_key',
} as const satisfies Record<FindObservablesSortField, keyof ObservableDocument>;

/**
 * A case holds at most one observable for each type key and value, so these two fields end every sort
 * with a unique key. That is what lets a page start right after the last observable of the previous
 * one. The document `_id` cannot do this job: Elasticsearch does not allow sorting on it by default.
 */
const TIE_BREAKER_FIELDS = ['type_key', 'value'] as const;

type SortableField = (typeof SORT_FIELD_TO_DOCUMENT_FIELD)[FindObservablesSortField];

const getSortFields = (sortField: FindObservablesSortField): SortableField[] => {
  const primary = SORT_FIELD_TO_DOCUMENT_FIELD[sortField];
  return [primary, ...TIE_BREAKER_FIELDS.filter((field) => field !== primary)];
};

/** The Elasticsearch sort of a page: the requested order for the sort field, ascending for the rest. */
export const buildObservablesSort = ({
  sortField,
  sortOrder,
}: {
  sortField: FindObservablesSortField;
  sortOrder: FindObservablesSortOrder;
}): Array<Partial<Record<SortableField, FindObservablesSortOrder>>> =>
  getSortFields(sortField).map((field, position) => ({
    [field]: position === 0 ? sortOrder : 'asc',
  }));

/** The observable as a case response shows it, with the id callers already know. */
export const toObservable = ({
  id,
  document,
}: {
  id: string;
  document: ObservableDocument;
}): Observable => ({
  id: document.legacy_id ?? id,
  typeKey: document.type_key,
  value: document.value,
  description: document.description ?? null,
  createdAt: document.created_at,
  // The index keeps the creation time when an observable was never updated, the case field a null.
  updatedAt: document.updated_at === document.created_at ? null : document.updated_at,
});

const compareStrings = (a: string, b: string): number => {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
};

const getSortKey = ({
  observable,
  field,
}: {
  observable: Observable;
  field: SortableField;
}): string => {
  switch (field) {
    case 'created_at':
      return observable.createdAt;
    case 'updated_at':
      return observable.updatedAt ?? observable.createdAt;
    case 'type_key':
      return observable.typeKey;
    default:
      return observable.value;
  }
};

/** A page of the observables that the case field of a case holds, ordered like the index orders them. */
export const pageCaseFieldObservables = ({
  observables,
  typeKeys,
  sortField,
  sortOrder,
  perPage,
  offset,
}: {
  observables: Observable[];
  typeKeys?: string[];
  sortField: FindObservablesSortField;
  sortOrder: FindObservablesSortOrder;
  perPage: number;
  offset: number;
}): { observables: Observable[]; total: number; nextOffset?: number } => {
  const typeKeySet = typeKeys && typeKeys.length > 0 ? new Set(typeKeys) : undefined;
  const matching = typeKeySet
    ? observables.filter(({ typeKey }) => typeKeySet.has(typeKey))
    : [...observables];

  const sortFields = getSortFields(sortField);
  matching.sort((a, b) => {
    for (const [position, field] of sortFields.entries()) {
      const result = compareStrings(
        getSortKey({ observable: a, field }),
        getSortKey({ observable: b, field })
      );
      if (result !== 0) {
        return position === 0 && sortOrder === 'desc' ? -result : result;
      }
    }
    return 0;
  });

  const end = offset + perPage;
  return {
    observables: matching.slice(offset, end),
    total: matching.length,
    nextOffset: end < matching.length ? end : undefined,
  };
};

const CursorSchema = lazySchema(() => {
  const sortValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);
  const sortField = z.enum(['created', 'updated', 'value', 'type']);
  const sortOrder = z.enum(['asc', 'desc']);

  return z.discriminatedUnion('source', [
    z.object({
      source: z.literal('index'),
      sortField,
      sortOrder,
      searchAfter: z.array(sortValue),
    }),
    z.object({
      source: z.literal('case'),
      sortField,
      sortOrder,
      offset: z.number().int().min(0),
    }),
  ]);
});

export type ObservablesCursor = z.infer<typeof CursorSchema>;

export const encodeObservablesCursor = (cursor: ObservablesCursor): string =>
  Buffer.from(JSON.stringify(cursor)).toString('base64url');

const INVALID_CURSOR_MESSAGE =
  'The cursor is not valid anymore. Request the first page of observables again.';

/**
 * Reads a cursor and checks it belongs to this request: the store it points into and the order it
 * was made for. A cursor of another store or order cannot continue the listing, so the caller starts
 * again from the first page.
 */
export const decodeObservablesCursor = ({
  cursor,
  source,
  sortField,
  sortOrder,
}: {
  cursor: string;
  source: ObservablesCursor['source'];
  sortField: FindObservablesSortField;
  sortOrder: FindObservablesSortOrder;
}): ObservablesCursor => {
  let parsed: ObservablesCursor;
  try {
    parsed = CursorSchema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')));
  } catch {
    throw Boom.badRequest(INVALID_CURSOR_MESSAGE);
  }

  if (
    parsed.source !== source ||
    parsed.sortField !== sortField ||
    parsed.sortOrder !== sortOrder
  ) {
    throw Boom.badRequest(INVALID_CURSOR_MESSAGE);
  }

  // Elasticsearch rejects search_after values that do not match the sort, which would answer a made-up
  // cursor with a server error instead of a request to start again.
  if (parsed.source === 'index' && parsed.searchAfter.length !== getSortFields(sortField).length) {
    throw Boom.badRequest(INVALID_CURSOR_MESSAGE);
  }

  return parsed;
};
