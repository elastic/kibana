/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { asSavedObjectExecutionSource } from '@kbn/actions-plugin/server';
import type {
  Case,
  CaseStatuses,
  ExternalSyncConflictStrategy,
} from '../../../common/types/domain';
import { UserActionTypes } from '../../../common/types/domain';
import type { ResolvedExternalSyncFieldRules } from '../../../common/utils/external_sync_fields';
import {
  pullsFromExternal,
  resolveExternalSyncFieldRules,
} from '../../../common/utils/external_sync_fields';
import { CASE_SAVED_OBJECT, MAX_COMMENT_LENGTH } from '../../../common/constants';
import { COMMENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { getExternalSyncCommentMetadata } from '../../../common/utils/external_sync_comments';
import type { CasesClient, CasesClientArgs } from '..';
import { Operations } from '../../authorization';
import type { ExternalIncidentComment, ExternalIncidentSnapshot } from '../../connectors';
import { casesConnectors } from '../../connectors';
import { createCaseError } from '../../common/error';
import {
  incrementCasesClientCounter,
  SYNC_CASE_APPLIED_COUNTER,
  SYNC_CASE_NO_CHANGES_COUNTER,
} from '../usage_counters';
import { getLatestPushInfo } from './utils';
import { getConnectorSyncSettings } from '../configure/get_connector_sync_settings';
import { buildMappedFieldsPatch, mappingsKeepKibanaValue } from './sync_mapped_fields';
import * as i18n from './translations';

export interface SyncParams {
  caseId: string;
}

export const SYNCED_FIELDS = ['title', 'description', 'status', 'tags'] as const;

interface SyncPatch {
  title?: string;
  description?: string;
  status?: CaseStatuses;
  tags?: string[];
}

// Push appends "Added by …" (and the case link) to the description; drop it so a
// round trip compares equal and auto-push does not append it again.
const ADDED_BY_PREFIX = i18n.ADDED_BY('').trimEnd();

/** Push appends the same footer to every comment it sends; a body carrying it came from Kibana. */
export const isPushedFromKibana = (body: string): boolean =>
  body.includes(`\n\n${ADDED_BY_PREFIX}`);

const sameValue = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) {
    const left = [...a].sort();
    const right = [...b].sort();
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }
  return a === b;
};

/**
 * External comments that are not on the case yet: skips the ones already imported (same
 * external id), the ones Kibana pushed (footer), and bodies the case cannot store.
 */
export const selectCommentsToImport = (
  theCase: Case,
  comments: ExternalIncidentComment[] | undefined
): ExternalIncidentComment[] => {
  if (comments == null || comments.length === 0) {
    return [];
  }

  const imported = new Set(
    (theCase.comments ?? [])
      .map((comment) => getExternalSyncCommentMetadata(comment)?.externalId)
      .filter((externalId): externalId is string => externalId != null)
  );

  return comments.filter(
    (comment) =>
      !imported.has(comment.externalId) &&
      !isPushedFromKibana(comment.body) &&
      comment.body.trim().length > 0 &&
      comment.body.length <= MAX_COMMENT_LENGTH
  );
};

export const stripKibanaInformationFromDescription = (description: string): string => {
  const footerStart = description.lastIndexOf(`\n\n${ADDED_BY_PREFIX}`);
  return footerStart === -1 ? description : description.slice(0, footerStart);
};

interface BuildSyncPatchOptions {
  /** Fields edited in Kibana since the baseline; only consulted for fields that keep the Kibana value. */
  changedInKibana: Set<string>;
  fieldRules: ResolvedExternalSyncFieldRules;
  defaultStrategy: ExternalSyncConflictStrategy;
}

export const buildSyncPatch = (
  theCase: Case,
  snapshot: ExternalIncidentSnapshot,
  { changedInKibana, fieldRules, defaultStrategy }: BuildSyncPatchOptions
): { patch: SyncPatch; updatedFields: string[]; conflictedFields: string[] } => {
  const patch: SyncPatch = {};
  const updatedFields: string[] = [];
  const conflictedFields: string[] = [];

  const pulledFields = SYNCED_FIELDS.filter((field) =>
    pullsFromExternal(fieldRules[field].direction)
  );

  for (const field of pulledFields) {
    const value =
      field === 'description' && snapshot.description != null
        ? stripKibanaInformationFromDescription(snapshot.description)
        : snapshot[field];

    if (value != null && !sameValue(value, theCase[field])) {
      const strategy = fieldRules[field].conflictStrategy ?? defaultStrategy;
      if (strategy === 'kibana' && changedInKibana.has(field)) {
        conflictedFields.push(field);
      } else {
        Object.assign(patch, { [field]: value });
        updatedFields.push(field);
      }
    }
  }

  return { patch, updatedFields, conflictedFields };
};

const keepsKibanaValueForAnyField = (
  fieldRules: ResolvedExternalSyncFieldRules,
  defaultStrategy: ExternalSyncConflictStrategy
): boolean =>
  SYNCED_FIELDS.some(
    (field) =>
      pullsFromExternal(fieldRules[field].direction) &&
      (fieldRules[field].conflictStrategy ?? defaultStrategy) === 'kibana'
  );

const getFieldsChangedSinceLastPush = async (
  caseId: string,
  connectorId: string,
  casesClient: CasesClient
): Promise<Set<string>> => {
  const userActions = await casesClient.userActions.getAll({ caseId });
  const latestPush = getLatestPushInfo(connectorId, userActions);

  if (latestPush == null) {
    return new Set();
  }

  // A previous sync wrote its own field updates just before its `sync` entry; those are
  // reconciled values, not Kibana edits, so the baseline is the last push or sync.
  const latestSyncIndex = userActions.map(({ type }) => type).lastIndexOf(UserActionTypes.sync);
  const baselineIndex = Math.max(latestPush.index, latestSyncIndex);
  const syncedFieldTypes: readonly string[] = [...SYNCED_FIELDS, UserActionTypes.extended_fields];

  return new Set(
    userActions
      .slice(baselineIndex + 1)
      .map(({ type }) => type)
      .filter((type) => syncedFieldTypes.includes(type))
  );
};

/**
 * Fetches the incident the case was pushed to and applies it to the case.
 * The request is a notification only: the external record is the snapshot.
 */
export const sync = async (
  { caseId }: SyncParams,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<Case> => {
  const {
    actionsClient,
    authorization,
    logger,
    user,
    services: { licensingService, userActionService },
  } = clientArgs;

  try {
    const theCase = await casesClient.cases.get({ id: caseId, includeComments: true });

    await authorization.ensureAuthorized({
      entities: [{ owner: theCase.owner, id: caseId }],
      operation: Operations.pushCase,
    });

    if (!(await licensingService.isAtLeastEnterprise())) {
      throw Boom.forbidden(
        'Syncing a case from its external incident requires an Enterprise license.'
      );
    }

    const externalService = theCase.external_service;
    if (externalService == null) {
      throw Boom.badRequest('The case has not been pushed to an external incident yet.');
    }

    if (externalService.connector_id !== theCase.connector.id) {
      throw Boom.badRequest(
        'The case connector changed after the last push. Push the case again before syncing.'
      );
    }

    const parseIncident = casesConnectors.get(theCase.connector.type)?.parseIncident;
    if (parseIncident == null) {
      throw Boom.badRequest(
        `Connector type ${theCase.connector.type} does not support syncing from the external incident.`
      );
    }

    const res = await actionsClient.execute({
      actionId: theCase.connector.id,
      params: {
        subAction: 'getIncident',
        subActionParams: { externalId: externalService.external_id },
      },
      source: asSavedObjectExecutionSource({ id: caseId, type: CASE_SAVED_OBJECT }),
    });

    if (res.status === 'error') {
      throw Boom.failedDependency(
        res.serviceMessage ?? res.message ?? 'Error getting the external incident'
      );
    }

    const snapshot = parseIncident(res.data as Record<string, unknown>);
    const connectorSync = await getConnectorSyncSettings(
      { connectorId: theCase.connector.id },
      clientArgs
    );
    const fieldRules = resolveExternalSyncFieldRules(connectorSync.externalSyncFields);
    const defaultStrategy = theCase.settings.externalSync?.conflictStrategy ?? 'external';
    const changedInKibana =
      keepsKibanaValueForAnyField(fieldRules, defaultStrategy) ||
      mappingsKeepKibanaValue(connectorSync.externalSyncFieldMappings, defaultStrategy)
        ? await getFieldsChangedSinceLastPush(caseId, theCase.connector.id, casesClient)
        : new Set<string>();

    const builtIn = buildSyncPatch(theCase, snapshot, {
      changedInKibana,
      fieldRules,
      defaultStrategy,
    });
    const mapped = await buildMappedFieldsPatch({
      theCase,
      incident: res.data as Record<string, unknown>,
      mappings: connectorSync.externalSyncFieldMappings,
      defaultStrategy,
      changedInKibana,
      clientArgs,
    });

    const patch = builtIn.patch;
    const updatedFields = [...builtIn.updatedFields, ...mapped.updatedFields];
    const conflictedFields = [...builtIn.conflictedFields, ...mapped.conflictedFields];

    if (updatedFields.length > 0) {
      await casesClient.cases.bulkUpdate(
        {
          cases: [
            {
              id: caseId,
              version: theCase.version,
              ...patch,
              ...(mapped.updatedFields.length > 0
                ? { extended_fields: mapped.extendedFields }
                : {}),
            },
          ],
        },
        { origin: 'external_sync' }
      );
    }

    const commentsToImport = pullsFromExternal(fieldRules.comments.direction)
      ? selectCommentsToImport(theCase, snapshot.comments)
      : [];

    if (commentsToImport.length > 0) {
      await casesClient.attachments.bulkCreate({
        caseId,
        origin: 'external_sync',
        attachments: commentsToImport.map((comment) => ({
          type: COMMENT_ATTACHMENT_TYPE,
          owner: theCase.owner,
          data: { content: comment.body },
          metadata: {
            externalSync: {
              externalId: comment.externalId,
              connectorName: externalService.connector_name,
              ...(comment.author != null ? { actor: comment.author } : {}),
              ...(comment.createdAt != null ? { externalCreatedAt: comment.createdAt } : {}),
            },
          },
        })),
      });
      updatedFields.push('comments');
    }

    await userActionService.creator.createUserAction({
      userAction: {
        type: UserActionTypes.sync,
        payload: {
          sync: {
            connector_name: externalService.connector_name,
            external_id: externalService.external_id,
            external_title: externalService.external_title,
            external_url: externalService.external_url,
            updated_fields: updatedFields,
            conflicted_fields: conflictedFields,
            ...(snapshot.updatedAt != null ? { external_updated_at: snapshot.updatedAt } : {}),
            ...(snapshot.updatedBy != null ? { external_updated_by: snapshot.updatedBy } : {}),
          },
        },
        user,
        caseId,
        owner: theCase.owner,
      },
    });

    incrementCasesClientCounter(
      clientArgs,
      updatedFields.length > 0 ? SYNC_CASE_APPLIED_COUNTER : SYNC_CASE_NO_CHANGES_COUNTER
    );

    return updatedFields.length > 0
      ? casesClient.cases.get({ id: caseId, includeComments: true })
      : theCase;
  } catch (error) {
    throw createCaseError({
      message: `Failed to sync case ${caseId} from its external incident: ${error}`,
      error,
      logger,
    });
  }
};
