/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { StoredInvestigationAttachment } from '../../common/investigation_attachments';
import type { InvestigationAttachmentStorage } from './attachment_doc_service';

interface StoredEntry<TStored> {
  source: TStored;
  seqNo: number;
}

const conflict = () => Object.assign(new Error('version_conflict'), { statusCode: 409 });

const fieldValue = (id: string, source: object, field: string): string | undefined => {
  if (field === '_id') {
    return id;
  }
  const value = (source as Record<string, string | undefined>)[field];
  return typeof value === 'string' ? value : undefined;
};

const matches = (
  id: string,
  source: object,
  clause: QueryDslQueryContainer | undefined
): boolean => {
  if (clause?.term) {
    const [[field, value]] = Object.entries(clause.term);
    return fieldValue(id, source, field) === value;
  }
  if (clause?.terms) {
    const [[field, values]] = Object.entries(clause.terms);
    const actual = fieldValue(id, source, field);
    return Array.isArray(values) && actual !== undefined && values.includes(actual);
  }
  if (clause?.bool) {
    const { filter = [], should = [] } = clause.bool;
    const filters = Array.isArray(filter) ? filter : [filter];
    const shoulds = Array.isArray(should) ? should : [should];
    return (
      filters.every((inner) => matches(id, source, inner)) &&
      (shoulds.length === 0 || shoulds.some((inner) => matches(id, source, inner)))
    );
  }
  throw new Error(`Unsupported clause in the in-memory storage: ${JSON.stringify(clause)}`);
};

/**
 * Just enough of the storage adapter for service tests: term / terms filters and bool
 * filter / should, versioned reads,
 * `op_type: 'create'` and `if_seq_no` conflicts, bulk deletes.
 */
export const createInMemoryStorage = <TStored extends StoredInvestigationAttachment>() => {
  const entries = new Map<string, StoredEntry<TStored>>();
  let seqNo = 0;

  const storage: InvestigationAttachmentStorage<TStored> & {
    entries: Map<string, StoredEntry<TStored>>;
    /** Writes as another writer would, bumping the version. */
    put: (id: string, source: TStored) => void;
  } = {
    entries,
    put: (id, source) => {
      entries.set(id, { source, seqNo: ++seqNo });
    },
    search: jest.fn(async (request) => {
      const filter = request.query?.bool?.filter;
      const clauses = Array.isArray(filter) ? filter : filter ? [filter] : [];
      const hits = [...entries.entries()]
        .filter(([id, { source }]) => clauses.every((clause) => matches(id, source, clause)))
        .slice(0, request.size)
        .map(([id, entry]) => ({
          _index: '.kibana-test',
          _id: id,
          _source: entry.source,
          ...(request.seq_no_primary_term && { _seq_no: entry.seqNo, _primary_term: 1 }),
        }));
      return { hits: { hits } };
    }),
    index: jest.fn(async (request) => {
      const existing = entries.get(request.id ?? '');
      if (request.op_type === 'create' && existing) {
        throw conflict();
      }
      if (request.if_seq_no !== undefined && existing?.seqNo !== request.if_seq_no) {
        throw conflict();
      }
      const id = request.id ?? `generated-${seqNo + 1}`;
      entries.set(id, { source: request.document as TStored, seqNo: ++seqNo });
      return {
        _id: id,
        _index: '.kibana-test',
        _version: 1,
        _shards: { total: 1, successful: 1, failed: 0 },
        result: 'created' as const,
      };
    }),
    delete: jest.fn(async (request) => {
      const existing = entries.get(request.id);
      if (request.if_seq_no !== undefined && existing?.seqNo !== request.if_seq_no) {
        throw conflict();
      }
      const deleted = entries.delete(request.id);
      return {
        acknowledged: true,
        result: deleted ? ('deleted' as const) : ('not_found' as const),
      };
    }),
    bulk: jest.fn(async (request) => {
      for (const operation of request.operations) {
        if ('delete' in operation) {
          entries.delete(operation.delete._id);
        }
      }
      return { errors: false, items: [], took: 0 };
    }),
  };
  return storage;
};
