/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { v5 as uuidv5 } from 'uuid';
import type { estypes } from '@elastic/elasticsearch';
import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsRawDoc,
  SavedObjectsRawDocSource,
} from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { spaceIdToNamespace } from '@kbn/spaces-plugin/server/lib/utils/namespace';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_OBSERVABLES_BULK_CREATE,
  MAX_OBSERVABLES_PER_CASE,
} from '../../../common/constants';
import { OBSERVABLE_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type { Case, Observable } from '../../../common/types/domain';
import type { ObservableAttachmentData } from '../../../common/types/domain/attachment/observable/v2';
import type { UnifiedAttachmentAttributes } from '../../../common/types/domain/attachment/v2';
import type { ObservablePost } from '../../../common/types/api';
import type { CasesClientArgs } from '../types';
import { buildFilter } from '../utils';

/** Fixed namespace for observable ids; changing it would change every derived id. */
const OBSERVABLE_ID_NAMESPACE = 'd68b8acc-618f-4c1a-9ecc-137579d8c4ad';

const attachmentField = (field: string) => `${CASE_ATTACHMENT_SAVED_OBJECT}.${field}`;

export type ObservableSortField = 'createdAt' | 'value' | 'typeKey';

const SORT_FIELDS: Readonly<Record<ObservableSortField, string>> = {
  createdAt: attachmentField('created_at'),
  value: attachmentField('data.value'),
  typeKey: attachmentField('data.typeKey'),
};

interface ObservableAttachmentAttributes {
  type: typeof OBSERVABLE_ATTACHMENT_TYPE;
  owner: string;
  data: ObservableAttachmentData;
  created_at: string;
  updated_at?: string | null;
}

export interface ObservablesSummary {
  total: number;
  preview: Observable[];
}

export interface CreateObservablesResult {
  added: Observable[];
  duplicates: number;
}

export interface FindObservablesArgs {
  caseId: string;
  perPage: number;
  cursor?: string;
  sortField: ObservableSortField;
  sortOrder: 'asc' | 'desc';
  typeKeys?: string[];
  search?: string;
}

export interface FindObservablesResult {
  observables: Observable[];
  total: number;
  cursor?: string;
}

/** Id of an observable: the same case, type key and value always map to the same saved object. */
export const deriveObservableId = ({
  caseId,
  typeKey,
  value,
}: {
  caseId: string;
  typeKey: string;
  value: string;
}): string => uuidv5(JSON.stringify([caseId, typeKey, value]), OBSERVABLE_ID_NAMESPACE);

/** Dedupe key for an observable inside one request. */
export const observableKey = ({ typeKey, value }: Pick<Observable, 'typeKey' | 'value'>): string =>
  JSON.stringify([typeKey, value]);

export const buildCaseReferences = (caseId: string): SavedObjectReference[] => [
  { type: CASE_SAVED_OBJECT, name: `associated-${CASE_SAVED_OBJECT}`, id: caseId },
];

const observableTypeFilter = () =>
  buildFilter({
    filters: [OBSERVABLE_ATTACHMENT_TYPE],
    field: 'type',
    operator: 'or',
    type: CASE_ATTACHMENT_SAVED_OBJECT,
  });

const isObservableOfCase = (
  so: SavedObject<unknown>,
  caseId: string
): so is SavedObject<ObservableAttachmentAttributes> =>
  (so.attributes as { type?: string } | undefined)?.type === OBSERVABLE_ATTACHMENT_TYPE &&
  so.references.some(({ type, id }) => type === CASE_SAVED_OBJECT && id === caseId);

export const toObservable = ({
  id,
  attributes,
}: SavedObject<ObservableAttachmentAttributes>): Observable => ({
  id,
  typeKey: attributes.data.typeKey,
  value: attributes.data.value,
  description: attributes.data.description ?? null,
  createdAt: attributes.created_at,
  updatedAt: attributes.updated_at ?? null,
});

export const countCaseObservables = async (
  caseId: string,
  { unsecuredSavedObjectsClient }: CasesClientArgs
): Promise<number> => {
  const { total } = await unsecuredSavedObjectsClient.find({
    type: CASE_ATTACHMENT_SAVED_OBJECT,
    perPage: 0,
    hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
    filter: observableTypeFilter(),
  });
  return total;
};

/** Returns the requested observables of a case and the ids that are missing or belong elsewhere. */
export const getCaseObservables = async (
  caseId: string,
  ids: string[],
  { unsecuredSavedObjectsClient }: CasesClientArgs
): Promise<{
  found: Array<SavedObject<ObservableAttachmentAttributes>>;
  missingIds: string[];
}> => {
  if (ids.length === 0) {
    return { found: [], missingIds: [] };
  }

  const { saved_objects: savedObjects } = await unsecuredSavedObjectsClient.bulkGet(
    ids.map((id) => ({ id, type: CASE_ATTACHMENT_SAVED_OBJECT }))
  );

  const found: Array<SavedObject<ObservableAttachmentAttributes>> = [];
  const missingIds: string[] = [];

  savedObjects.forEach((so, index) => {
    if (!isSavedObjectErrorResult(so) && isObservableOfCase(so, caseId)) {
      found.push(so);
    } else {
      missingIds.push(ids[index]);
    }
  });

  return { found, missingIds };
};

export const getCaseObservable = async (
  caseId: string,
  observableId: string,
  clientArgs: CasesClientArgs
): Promise<SavedObject<ObservableAttachmentAttributes>> => {
  const {
    found: [observable],
  } = await getCaseObservables(caseId, [observableId], clientArgs);

  if (observable == null) {
    throw Boom.notFound(`Observable id ${observableId} not found in case ${caseId}`);
  }

  return observable;
};

type AttachmentUser = UnifiedAttachmentAttributes['created_by'];

const toAttachmentUser = (user: CasesClientArgs['user']): AttachmentUser => ({
  email: user.email ?? null,
  full_name: user.full_name ?? null,
  username: user.username ?? null,
  ...(user.profile_uid != null && { profile_uid: user.profile_uid }),
});

/** Attributes of an observable attachment; `legacyId` is set only for observables migrated off the case. */
export const buildObservableAttachmentAttributes = ({
  observable: { typeKey, value, description },
  legacyId,
  owner,
  createdAt,
  updatedAt = null,
  createdBy,
}: {
  observable: ObservablePost;
  legacyId?: string;
  owner: string;
  createdAt: string;
  updatedAt?: string | null;
  createdBy: AttachmentUser;
}): UnifiedAttachmentAttributes => ({
  type: OBSERVABLE_ATTACHMENT_TYPE,
  owner,
  data: {
    typeKey,
    value,
    description: description ?? null,
    ...(legacyId != null && { legacyId }),
  },
  created_at: createdAt,
  created_by: createdBy,
  pushed_at: null,
  pushed_by: null,
  updated_at: updatedAt,
  updated_by: null,
});

/**
 * Creates observables with derived ids. An id that already exists (409) means the case already
 * holds that type key and value, so it is counted as a duplicate rather than an error.
 * Observables have no legacy form, so they are always `cases-attachments` objects, whatever
 * `xpack.cases.attachments.enabled` says, and are not mirrored to analytics.
 */
export const createCaseObservables = async ({
  caseId,
  owner,
  observables,
  clientArgs,
}: {
  caseId: string;
  owner: string;
  observables: ObservablePost[];
  clientArgs: CasesClientArgs;
}): Promise<CreateObservablesResult> => {
  const { unsecuredSavedObjectsClient, user } = clientArgs;
  const createdAt = new Date().toISOString();
  const references = buildCaseReferences(caseId);
  const added: Observable[] = [];
  let duplicates = 0;

  for (let start = 0; start < observables.length; start += MAX_OBSERVABLES_BULK_CREATE) {
    const chunk = observables.slice(start, start + MAX_OBSERVABLES_BULK_CREATE);
    const { saved_objects: results } = await unsecuredSavedObjectsClient.bulkCreate(
      chunk.map((observable) => ({
        type: CASE_ATTACHMENT_SAVED_OBJECT,
        id: deriveObservableId({ caseId, ...observable }),
        attributes: buildObservableAttachmentAttributes({
          observable,
          owner,
          createdAt,
          createdBy: toAttachmentUser(user),
        }),
        references,
      })),
      { refresh: 'wait_for' }
    );

    const failures: string[] = [];
    results.forEach((result, index) => {
      if (!isSavedObjectErrorResult(result)) {
        const { typeKey, value, description } = chunk[index];
        added.push({
          id: result.id,
          typeKey,
          value,
          description: description ?? null,
          createdAt,
          updatedAt: null,
        });
      } else if (result.error.statusCode === 409) {
        duplicates += 1;
      } else {
        failures.push(`${result.id}: ${result.error.message}`);
      }
    });

    if (failures.length > 0) {
      throw Boom.internal(
        `Failed to create ${failures.length} observables on case ${caseId}: ${failures.join('; ')}`
      );
    }
  }

  return { added, duplicates };
};

/** Updates an observable's description in place; its type key and value, and so its id, stay. */
export const updateCaseObservableDescription = async (
  observableId: string,
  data: ObservableAttachmentData,
  { unsecuredSavedObjectsClient, user }: CasesClientArgs
): Promise<void> => {
  await unsecuredSavedObjectsClient.update(
    CASE_ATTACHMENT_SAVED_OBJECT,
    observableId,
    {
      data,
      updated_at: new Date().toISOString(),
      updated_by: toAttachmentUser(user),
    },
    { refresh: 'wait_for' }
  );
};

export const deleteCaseObservables = async (
  observableIds: string[],
  { unsecuredSavedObjectsClient }: CasesClientArgs
): Promise<void> => {
  await unsecuredSavedObjectsClient.bulkDelete(
    observableIds.map((id) => ({ type: CASE_ATTACHMENT_SAVED_OBJECT, id })),
    { refresh: 'wait_for' }
  );
};

const encodeCursor = (sort: estypes.SortResults): string =>
  Buffer.from(JSON.stringify(sort)).toString('base64');

const decodeCursor = (cursor: string): estypes.SortResults => {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
    if (
      Array.isArray(decoded) &&
      decoded.length > 0 &&
      decoded.length <= 3 &&
      decoded.every((entry) => typeof entry === 'string' || typeof entry === 'number')
    ) {
      return decoded;
    }
  } catch {
    // fall through to the bad request below
  }
  throw Boom.badRequest('Invalid observables cursor');
};

const escapeWildcard = (value: string): string => value.replace(/[\\*?]/g, (char) => `\\${char}`);

/**
 * Pages a case's observables with `search_after`. The sort ends with type key and value, which
 * are unique within a case, so pages are stable without a point in time.
 */
export const findCaseObservables = async (
  { caseId, perPage, cursor, sortField, sortOrder, typeKeys, search }: FindObservablesArgs,
  { unsecuredSavedObjectsClient, savedObjectsSerializer, spaceId }: CasesClientArgs
): Promise<FindObservablesResult> => {
  const tieBreakers = (['typeKey', 'value'] as const).filter((field) => field !== sortField);
  const sort: estypes.Sort = [
    { [SORT_FIELDS[sortField]]: { order: sortOrder } },
    ...tieBreakers.map((field) => ({ [SORT_FIELDS[field]]: { order: 'asc' as const } })),
  ];

  const filter: estypes.QueryDslQueryContainer[] = [
    { term: { [attachmentField('type')]: OBSERVABLE_ATTACHMENT_TYPE } },
    {
      nested: {
        path: 'references',
        query: {
          bool: {
            filter: [
              { term: { 'references.type': CASE_SAVED_OBJECT } },
              { term: { 'references.id': caseId } },
            ],
          },
        },
      },
    },
  ];

  if (typeKeys != null && typeKeys.length > 0) {
    filter.push({ terms: { [attachmentField('data.typeKey')]: typeKeys } });
  }

  if (search != null && search.length > 0) {
    filter.push({
      wildcard: {
        [attachmentField('data.value')]: {
          value: `*${escapeWildcard(search)}*`,
          case_insensitive: true,
        },
      },
    });
  }

  const response = await unsecuredSavedObjectsClient.search<SavedObjectsRawDocSource>({
    type: CASE_ATTACHMENT_SAVED_OBJECT,
    namespaces: [spaceIdToNamespace(spaceId) ?? DEFAULT_NAMESPACE_STRING],
    size: perPage,
    track_total_hits: true,
    sort,
    ...(cursor != null && { search_after: decodeCursor(cursor) }),
    query: { bool: { filter } },
  });

  const { hits } = response.hits;
  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;
  const observables = hits.map((hit) =>
    toObservable(
      savedObjectsSerializer.rawToSavedObject<ObservableAttachmentAttributes>(
        hit as SavedObjectsRawDoc
      )
    )
  );
  const lastSort = hits.length === perPage ? hits[hits.length - 1]?.sort : undefined;

  return {
    observables,
    total,
    ...(lastSort != null && { cursor: encodeCursor(lastSort) }),
  };
};

interface ObservablesSummaryAggs {
  refs: {
    caseIds: {
      buckets: Array<{
        key: string;
        reverse: {
          doc_count: number;
          preview: { hits: { hits: SavedObjectsRawDoc[] } };
        };
      }>;
    };
  };
}

/**
 * The total and the first observables (by creation time) of each case, in one aggregation for
 * the whole page of cases.
 */
export const getObservablesSummary = async (
  caseIds: string[],
  { unsecuredSavedObjectsClient, savedObjectsSerializer }: CasesClientArgs,
  previewSize: number = MAX_OBSERVABLES_PER_CASE
): Promise<Map<string, ObservablesSummary>> => {
  const summaries = new Map<string, ObservablesSummary>();
  if (caseIds.length === 0) {
    return summaries;
  }

  const res = await unsecuredSavedObjectsClient.find<unknown, ObservablesSummaryAggs>({
    type: CASE_ATTACHMENT_SAVED_OBJECT,
    perPage: 0,
    hasReference: caseIds.map((id) => ({ type: CASE_SAVED_OBJECT, id })),
    hasReferenceOperator: 'OR',
    filter: observableTypeFilter(),
    aggs: {
      refs: {
        nested: { path: `${CASE_ATTACHMENT_SAVED_OBJECT}.references` },
        aggregations: {
          caseIds: {
            terms: {
              field: `${CASE_ATTACHMENT_SAVED_OBJECT}.references.id`,
              size: caseIds.length,
              include: caseIds,
            },
            aggregations: {
              reverse: {
                reverse_nested: {},
                aggregations: {
                  preview: {
                    top_hits: {
                      size: previewSize,
                      sort: [{ [attachmentField('created_at')]: { order: 'asc' } }],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  for (const bucket of res.aggregations?.refs.caseIds.buckets ?? []) {
    summaries.set(bucket.key, {
      total: bucket.reverse.doc_count,
      preview: bucket.reverse.preview.hits.hits.map((hit) =>
        toObservable(savedObjectsSerializer.rawToSavedObject<ObservableAttachmentAttributes>(hit))
      ),
    });
  }

  return summaries;
};

/** Replaces a case response's `observables` and `total_observables` with the stored summary. */
export const withObservablesSummary = <T extends Pick<Case, 'id' | 'observables'>>(
  theCase: T,
  summaries: Map<string, ObservablesSummary>
): T & { total_observables: number } => {
  const summary = summaries.get(theCase.id);
  return {
    ...theCase,
    observables: summary?.preview ?? [],
    total_observables: summary?.total ?? 0,
  };
};
