/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isEmpty, uniqBy } from 'lodash';
import type { UserProfile } from '@kbn/security-plugin/common';
import type { IBasePath } from '@kbn/core-http-browser';
import type { Logger } from '@kbn/logging';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { v4 } from 'uuid';
import type { SavedObject } from '@kbn/core/server';
import type {
  ActionConnector,
  AttachmentV2,
  Case,
  CaseAssignees,
  CaseAttributes,
  CaseCustomField,
  CaseStatusesConfiguration,
  ConnectorMappings,
  ConnectorMappingSource,
  ConnectorMappingTarget,
  CustomFieldsConfiguration,
  ExternalService,
  Observable,
  User,
} from '../../../common/types/domain';
import type { Template } from '../../../common/types/domain/template/latest';
import { AttachmentType, CaseStatuses, UserActionTypes } from '../../../common/types/domain';
import {
  findStatusByKey,
  getBuiltInStatuses,
  getDefaultStatus,
  getEffectiveStatuses,
} from '../../../common/utils/statuses';
import type {
  AttachmentRequestV2,
  CasePostRequest,
  CaseRequestCustomFields,
  CaseUserActionsDeprecatedResponse,
  ObservablePost,
} from '../../../common/types/api';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { isPushedUserAction } from '../../../common/utils/user_actions';
import type { CasesClientGetAlertsResponse } from '../alerts/types';
import type { ExternalServiceComment, ExternalServiceIncident } from './types';
import type { CasesConnectorsMap } from '../../connectors';
import { getCaseViewPath } from '../../common/utils';
import {
  isCommentAttachmentType,
  isLegacyAttachmentRequest,
  isUnifiedAlertAttachment,
  toStringArray,
} from '../../../common/utils/attachments';
import { COMMENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type { InlineField } from '../../../common/types/domain/template/fields';
import { getFieldSnakeKey } from '../../../common/utils/template_fields';
import * as i18n from './translations';

interface CreateIncidentArgs {
  theCase: Case;
  userActions: CaseUserActionsDeprecatedResponse;
  connector: ActionConnector;
  alerts: CasesClientGetAlertsResponse;
  casesConnectors: CasesConnectorsMap;
  spaceId: string;
  userProfiles?: Map<string, UserProfile>;
  publicBaseUrl?: IBasePath['publicBaseUrl'];
}

export const dedupAssignees = (assignees?: CaseAssignees): CaseAssignees | undefined => {
  if (assignees == null) {
    return;
  }

  return uniqBy(assignees, 'uid');
};

export const getCloseReasonIfValid = (closeReason?: string): string | undefined =>
  closeReason != null && closeReason.trim().length > 0 ? closeReason : undefined;

type LatestPushInfo = { index: number; pushedInfo: ExternalService | null } | null;

export const getLatestPushInfo = (
  connectorId: string,
  userActions: CaseUserActionsDeprecatedResponse
): LatestPushInfo => {
  for (const [index, action] of [...userActions].reverse().entries()) {
    if (isPushedUserAction(action) && connectorId === action.payload.externalService.connector_id) {
      try {
        const pushedInfo = action.payload.externalService;
        // We returned the index of the element in the userActions array.
        // As we traverse the userActions in reverse we need to calculate the index of a normal traversal
        return {
          index: userActions.length - index - 1,
          pushedInfo,
        };
      } catch (e) {
        // ignore parse failures and check the next user action
      }
    }
  }

  return null;
};

/**
 * Returns the body text for a comment pushed to an external incident system
 * (ServiceNow, Jira, Resilient, Swimlane).
 */
const getCommentContent = (comment: AttachmentV2): string => {
  if (isLegacyAttachmentRequest(comment) && comment.type === AttachmentType.user) {
    return comment.comment;
  }

  if (comment.type === COMMENT_ATTACHMENT_TYPE && 'data' in comment) {
    const content = comment.data?.content;
    return typeof content === 'string' ? content : '';
  }

  return '';
};

interface CountAlertsInfo {
  totalComments: number;
  pushed: number;
  totalAlerts: number;
}

// Returns the number of alert ids on the attachment, or `null` when the
// attachment is not an alert
const countAlertIds = (comment: AttachmentV2): number | null => {
  if (isLegacyAttachmentRequest(comment) && comment.type === AttachmentType.alert) {
    return toStringArray(comment.alertId).length;
  }
  const asRequest = comment as AttachmentRequestV2;
  if (isUnifiedAlertAttachment(asRequest)) {
    return toStringArray(asRequest.attachmentId).length;
  }
  return null;
};

const getAlertsInfo = (
  comments: Case['comments']
): { totalAlerts: number; hasUnpushedAlertComments: boolean } => {
  const countingInfo = { totalComments: 0, pushed: 0, totalAlerts: 0 };

  const res =
    comments?.reduce<CountAlertsInfo>(({ totalComments, pushed, totalAlerts }, comment) => {
      const alertIdCount = countAlertIds(comment);
      if (alertIdCount === null) {
        return { totalComments, pushed, totalAlerts };
      }

      return {
        totalComments: totalComments + 1,
        pushed: comment.pushed_at != null ? pushed + 1 : pushed,
        totalAlerts: totalAlerts + alertIdCount,
      };
    }, countingInfo) ?? countingInfo;

  return {
    totalAlerts: res.totalAlerts,
    hasUnpushedAlertComments: res.totalComments > res.pushed,
  };
};

const addAlertMessage = (params: {
  theCase: Case;
  externalServiceComments: ExternalServiceComment[];
  spaceId: string;
  publicBaseUrl?: IBasePath['publicBaseUrl'];
}): ExternalServiceComment[] => {
  const { theCase, externalServiceComments, spaceId, publicBaseUrl } = params;
  const { totalAlerts, hasUnpushedAlertComments } = getAlertsInfo(theCase.comments);

  const newComments = [...externalServiceComments];

  if (hasUnpushedAlertComments) {
    let comment = `Elastic Alerts attached to the case: ${totalAlerts}`;

    if (publicBaseUrl) {
      const alertsTableUrl = getCaseViewPath({
        publicBaseUrl,
        spaceId,
        caseId: theCase.id,
        owner: theCase.owner,
        tabId: CASE_VIEW_PAGE_TABS.ALERTS,
      });

      comment = `${comment}\n\n${i18n.VIEW_ALERTS_IN_KIBANA}\n${i18n.ALERTS_URL(alertsTableUrl)}`;
    }

    newComments.push({
      comment,
      commentId: `${theCase.id}-total-alerts`,
    });
  }

  return newComments;
};

export const createIncident = async ({
  theCase,
  userActions,
  connector,
  alerts,
  casesConnectors,
  userProfiles,
  spaceId,
  publicBaseUrl,
}: CreateIncidentArgs): Promise<ExternalServiceIncident> => {
  const latestPushInfo = getLatestPushInfo(connector.id, userActions);
  const externalId = latestPushInfo?.pushedInfo?.external_id ?? null;

  const externalServiceFields =
    casesConnectors.get(connector.actionTypeId)?.format(theCase, alerts) ?? {};

  const connectorMappings = casesConnectors.get(connector.actionTypeId)?.getMapping() ?? [];
  const descriptionWithKibanaInformation = addKibanaInformationToDescription(
    theCase,
    spaceId,
    userProfiles,
    publicBaseUrl
  );

  const comments = formatComments({
    userActions,
    latestPushInfo,
    theCase,
    userProfiles,
    spaceId,
    publicBaseUrl,
  });

  const mappedIncident = mapCaseFieldsToExternalSystemFields(
    { title: theCase.title, description: descriptionWithKibanaInformation },
    connectorMappings
  );

  const incident = {
    ...mappedIncident,
    ...externalServiceFields,
    externalId,
  };
  return { incident, comments };
};

export const mapCaseFieldsToExternalSystemFields = (
  caseFields: Record<Exclude<ConnectorMappingSource, 'comments' | 'tags'>, unknown>,
  mapping: ConnectorMappings
): Record<ConnectorMappingTarget, unknown> => {
  const mappedCaseFields: Record<ConnectorMappingTarget, unknown> = {};

  for (const caseFieldKey of Object.keys(caseFields) as Array<
    Exclude<ConnectorMappingSource, 'comments' | 'tags'>
  >) {
    const mapDefinition = mapping.find(
      (mappingEntry) => mappingEntry.source === caseFieldKey && mappingEntry.target !== 'not_mapped'
    );

    if (mapDefinition) {
      mappedCaseFields[mapDefinition.target] = caseFields[caseFieldKey];
    }
  }

  return mappedCaseFields;
};

export const formatComments = ({
  userActions,
  latestPushInfo,
  theCase,
  spaceId,
  userProfiles,
  publicBaseUrl,
}: {
  theCase: Case;
  latestPushInfo: LatestPushInfo;
  userActions: CaseUserActionsDeprecatedResponse;
  spaceId: string;
  userProfiles?: Map<string, UserProfile>;
  publicBaseUrl?: IBasePath['publicBaseUrl'];
}): ExternalServiceComment[] => {
  const commentsIdsToBeUpdated = new Set(
    userActions
      .slice(latestPushInfo?.index ?? 0)
      .filter((action) => action.type === UserActionTypes.comment)
      .map((action) => action.comment_id)
  );

  const commentsToBeUpdated = theCase.comments?.filter(
    // Push only user-authored comments — legacy `user` and unified `comment`.
    (comment) => isCommentAttachmentType(comment.type) && commentsIdsToBeUpdated.has(comment.id)
  );

  let comments: ExternalServiceComment[] = [];

  if (commentsToBeUpdated && Array.isArray(commentsToBeUpdated) && commentsToBeUpdated.length > 0) {
    comments = addKibanaInformationToComments(commentsToBeUpdated, userProfiles);
  }

  comments = addAlertMessage({
    theCase,
    externalServiceComments: comments,
    spaceId,
    publicBaseUrl,
  });
  return comments;
};

export const addKibanaInformationToDescription = (
  theCase: Case,
  spaceId: string,
  userProfiles?: Map<string, UserProfile>,
  publicBaseUrl?: IBasePath['publicBaseUrl']
) => {
  const addedBy = i18n.ADDED_BY(
    getEntity(
      {
        createdBy: theCase.created_by,
        updatedBy: theCase.updated_by,
      },
      userProfiles
    )
  );

  const descriptionWithKibanaInformation = `${theCase.description}\n\n${addedBy}.`;

  if (!publicBaseUrl) {
    return descriptionWithKibanaInformation;
  }

  const caseUrl = getCaseViewPath({
    publicBaseUrl,
    spaceId,
    caseId: theCase.id,
    owner: theCase.owner,
  });

  return `${descriptionWithKibanaInformation}\n${i18n.VIEW_IN_KIBANA}.\n${i18n.CASE_URL(caseUrl)}`;
};

const addKibanaInformationToComments = (
  comments: Case['comments'] = [],
  userProfiles?: Map<string, UserProfile>
): ExternalServiceComment[] =>
  comments.map((theComment) => {
    const addedBy = i18n.ADDED_BY(
      getEntity(
        {
          createdBy: theComment.created_by,
          updatedBy: theComment.updated_by,
        },
        userProfiles
      )
    );

    return {
      comment: `${getCommentContent(theComment)}\n\n${addedBy}.`,
      commentId: theComment.id,
    };
  });

export const getEntity = (
  entity: { createdBy: Case['created_by']; updatedBy: Case['updated_by'] },
  userProfiles?: Map<string, UserProfile>
): string => {
  return (
    getDisplayName(entity.updatedBy, userProfiles) ??
    getDisplayName(entity.createdBy, userProfiles) ??
    i18n.UNKNOWN
  );
};

const getDisplayName = (
  user: User | null | undefined,
  userProfiles?: Map<string, UserProfile>
): string | undefined => {
  if (user == null) {
    return;
  }

  if (user.profile_uid != null) {
    const updatedByProfile = userProfiles?.get(user.profile_uid);

    if (updatedByProfile != null) {
      return (
        validOrUndefined(updatedByProfile.user.full_name) ??
        validOrUndefined(updatedByProfile.user.username)
      );
    }
  }

  return validOrUndefined(user.full_name) ?? validOrUndefined(user.username) ?? i18n.UNKNOWN;
};

const validOrUndefined = (value: string | undefined | null): string | undefined => {
  if (value == null || isEmpty(value)) {
    return;
  }

  return value;
};

/**
 * The statuses a case of this owner can be in. With the flag off the stored list is ignored so
 * cases keep landing on the built-in statuses.
 */
export const getConfiguredStatuses = ({
  configuration,
  customStatusesEnabled,
}: {
  configuration?: { statuses?: CaseStatusesConfiguration };
  customStatusesEnabled: boolean;
}): CaseStatusesConfiguration =>
  customStatusesEnabled ? getEffectiveStatuses(configuration?.statuses) : getBuiltInStatuses();

/**
 * Turns the `status` and `status_key` of a request into what gets persisted: `status` always
 * holds the category; `status_key` is only written while custom statuses are enabled.
 */
export const resolveStatusForUpdate = ({
  status,
  statusKey,
  statuses,
  customStatusesEnabled,
}: {
  status?: CaseStatuses;
  statusKey?: string;
  statuses: CaseStatusesConfiguration;
  customStatusesEnabled: boolean;
}): { status: CaseStatuses; status_key?: string } | undefined => {
  if (statusKey != null) {
    if (!customStatusesEnabled) {
      throw Boom.badRequest('Custom statuses are not enabled');
    }

    const configured = findStatusByKey(statuses, statusKey);

    if (configured == null || configured.disabled) {
      throw Boom.badRequest(`Unknown status key: ${statusKey}`);
    }

    if (status != null && status !== configured.category) {
      throw Boom.badRequest(
        `The status "${status}" does not match the category of the status key "${statusKey}"`
      );
    }

    return { status: configured.category, status_key: statusKey };
  }

  if (status == null) {
    return;
  }

  if (!customStatusesEnabled) {
    return { status };
  }

  return { status, status_key: getDefaultStatus(statuses, status)?.key ?? status };
};

export type PauseFields = Pick<
  CaseAttributes,
  'paused_at' | 'time_paused' | 'pause_reason' | 'resume_to_status_key'
>;

/**
 * Starts, continues, or ends the pause that goes with a status change. Time in a status that
 * pauses time tracking accumulates into `time_paused`, which the closing metrics subtract.
 *
 * - Moving to a pausing status requires a configured reason and remembers where the case came
 *   from so Resume can take it back.
 * - Moving between two pausing statuses keeps the pause running; a new reason replaces the old.
 * - Leaving a pausing status, including by closing, adds the interval to `time_paused`.
 * - Reopening a closed case starts over with no paused time, like the other timing metrics.
 */
export const getPauseFieldsForUpdate = ({
  originalCase,
  targetStatusKey,
  targetCategory,
  pauseReason,
  statuses,
  pauseReasons,
  customStatusesEnabled,
  stateTransitionTimestamp,
}: {
  originalCase: Pick<
    CaseAttributes,
    'status' | 'status_key' | 'paused_at' | 'time_paused' | 'pause_reason'
  >;
  /** The resolved `status_key` of the update, undefined when the status does not change */
  targetStatusKey?: string;
  targetCategory?: CaseStatuses;
  pauseReason?: string;
  statuses: CaseStatusesConfiguration;
  pauseReasons: string[];
  customStatusesEnabled: boolean;
  stateTransitionTimestamp: string;
}): Partial<PauseFields> | undefined => {
  if (!customStatusesEnabled) {
    if (pauseReason != null) {
      throw Boom.badRequest('Custom statuses are not enabled');
    }
    return;
  }

  const assertKnownReason = (reason: string) => {
    if (!pauseReasons.includes(reason)) {
      throw Boom.badRequest(`Unknown pause reason: ${reason}`);
    }
  };

  const wasPaused = originalCase.paused_at != null;
  const target = targetStatusKey != null ? findStatusByKey(statuses, targetStatusKey) : undefined;

  if (target == null) {
    if (pauseReason == null) {
      return;
    }
    if (!wasPaused) {
      throw Boom.badRequest(
        'A pause reason can only be set when moving a case to a status that pauses time tracking'
      );
    }
    assertKnownReason(pauseReason);
    return { pause_reason: pauseReason };
  }

  if (target.pausesTimeTracking) {
    if (pauseReason != null) {
      assertKnownReason(pauseReason);
    }
    if (wasPaused) {
      return pauseReason != null ? { pause_reason: pauseReason } : undefined;
    }
    if (pauseReason == null) {
      throw Boom.badRequest(`A pause reason is required when moving a case to "${target.label}"`);
    }
    return {
      paused_at: stateTransitionTimestamp,
      pause_reason: pauseReason,
      resume_to_status_key:
        originalCase.status_key ??
        getDefaultStatus(statuses, originalCase.status)?.key ??
        originalCase.status,
    };
  }

  if (pauseReason != null) {
    throw Boom.badRequest(`The status "${target.label}" does not pause time tracking`);
  }

  const reopened =
    originalCase.status === CaseStatuses.closed && targetCategory !== CaseStatuses.closed;

  if (wasPaused) {
    const pausedFor = Math.max(
      Math.floor(
        (new Date(stateTransitionTimestamp).getTime() -
          new Date(originalCase.paused_at as string).getTime()) /
          1000
      ),
      0
    );
    return {
      paused_at: null,
      pause_reason: null,
      resume_to_status_key: null,
      time_paused: reopened ? 0 : (originalCase.time_paused ?? 0) + pausedFor,
    };
  }

  return reopened && (originalCase.time_paused ?? 0) > 0 ? { time_paused: 0 } : undefined;
};

export const getClosedInfoForUpdate = ({
  user,
  status,
  closedDate,
}: {
  closedDate: string;
  user: User;
  status?: CaseStatuses;
}): Pick<CaseAttributes, 'closed_at' | 'closed_by'> | undefined => {
  if (status && status === CaseStatuses.closed) {
    return {
      closed_at: closedDate,
      closed_by: user,
    };
  }

  if (status && (status === CaseStatuses.open || status === CaseStatuses['in-progress'])) {
    return {
      closed_at: null,
      closed_by: null,
    };
  }
};

/**
 * If the status changes to 'in-progress' and in_progress_at is not set, we set it to the current date.
 * If the status does not change to 'in-progress' or in_progress_at is already set, we do not change it.
 */

export const getInProgressInfoForUpdate = ({
  status,
  stateTransitionTimestamp,
  inProgressAt,
}: {
  status?: CaseStatuses;
  stateTransitionTimestamp: string;
  inProgressAt?: string | null;
}): Partial<Pick<CaseAttributes, 'in_progress_at'>> | undefined => {
  if (status && status === CaseStatuses['in-progress'] && inProgressAt == null) {
    return {
      in_progress_at: stateTransitionTimestamp,
    };
  }
};

const areValidDatesWhenChangingToInProgress = (createdAtMillis: number, updatedAtMillis: number) =>
  !isNaN(createdAtMillis) && !isNaN(updatedAtMillis) && updatedAtMillis >= createdAtMillis;

const areValidDatesWhenClosing = (
  createdAtMillis: number,
  stateTransitionTimestampMillis: number,
  inProgressAtMillis: number | null
) => {
  if (
    isNaN(createdAtMillis) ||
    isNaN(stateTransitionTimestampMillis) ||
    stateTransitionTimestampMillis < createdAtMillis
  ) {
    return false;
  }

  if (inProgressAtMillis != null) {
    return (
      !isNaN(inProgressAtMillis) &&
      inProgressAtMillis >= createdAtMillis &&
      stateTransitionTimestampMillis >= inProgressAtMillis
    );
  }

  return true;
};

/**
 * Calculates timing metrics based on the case status and timestamps.
 * If the status is 'closed', it calculates all metrics.
 * If the status is 'in-progress', it calculates only the time to acknowledge and sets the other metrics to null.
 * If the status is 'open', it nullifies all metrics.
 */

export const getTimingMetricsForUpdate = ({
  status,
  createdAt,
  inProgressAt,
  stateTransitionTimestamp,
  timePaused = 0,
}: {
  status?: CaseStatuses;
  createdAt: string;
  stateTransitionTimestamp: string;
  inProgressAt?: string | null;
  /** Seconds spent in statuses that pause time tracking, left out of the closing metrics */
  timePaused?: number | null;
}):
  | Partial<Pick<CaseAttributes, 'time_to_acknowledge' | 'time_to_investigate' | 'time_to_resolve'>>
  | undefined => {
  try {
    const createdAtMillis = new Date(createdAt).getTime();
    const stateTransitionTimestampMillis = new Date(stateTransitionTimestamp).getTime();
    const inProgressAtMillis = inProgressAt ? new Date(inProgressAt).getTime() : null;

    if (status && status === CaseStatuses['in-progress']) {
      if (
        createdAt != null &&
        stateTransitionTimestamp != null &&
        areValidDatesWhenChangingToInProgress(createdAtMillis, stateTransitionTimestampMillis)
      ) {
        return {
          time_to_acknowledge: calculateTimeDifferenceInSeconds(
            stateTransitionTimestampMillis,
            createdAtMillis
          ),
          time_to_investigate: null,
          time_to_resolve: null,
        };
      }
    }

    if (status && status === CaseStatuses.closed) {
      if (
        createdAt != null &&
        stateTransitionTimestamp != null &&
        areValidDatesWhenClosing(
          createdAtMillis,
          stateTransitionTimestampMillis,
          inProgressAtMillis
        )
      ) {
        const paused = Math.max(timePaused ?? 0, 0);
        const timeToResolve = Math.max(
          calculateTimeDifferenceInSeconds(stateTransitionTimestampMillis, createdAtMillis) -
            paused,
          0
        );

        const timeToAcknowledge =
          inProgressAtMillis != null
            ? calculateTimeDifferenceInSeconds(inProgressAtMillis, createdAtMillis)
            : timeToResolve;

        const timeToInvestigate =
          inProgressAtMillis != null
            ? Math.max(
                calculateTimeDifferenceInSeconds(
                  stateTransitionTimestampMillis,
                  inProgressAtMillis
                ) - paused,
                0
              )
            : 0;

        return {
          time_to_acknowledge: timeToAcknowledge,
          time_to_investigate: timeToInvestigate,
          time_to_resolve: timeToResolve,
        };
      }
    }

    if (status && status === CaseStatuses.open) {
      // Reset all metrics when the status is re-opened
      return {
        time_to_acknowledge: null,
        time_to_investigate: null,
        time_to_resolve: null,
      };
    }
  } catch (err) {
    // Silence date errors
  }
};

const calculateTimeDifferenceInSeconds = (endTime: number, startTime: number) =>
  Math.floor((endTime - startTime) / 1000);

export const getDurationInSeconds = ({
  closedAt,
  createdAt,
  timePaused = 0,
}: {
  closedAt: string;
  createdAt: CaseAttributes['created_at'];
  timePaused?: number | null;
}) => {
  try {
    if (createdAt != null && closedAt != null) {
      const createdAtMillis = new Date(createdAt).getTime();
      const closedAtMillis = new Date(closedAt).getTime();

      if (!isNaN(createdAtMillis) && !isNaN(closedAtMillis) && closedAtMillis >= createdAtMillis) {
        const elapsed = Math.floor((closedAtMillis - createdAtMillis) / 1000);
        return { duration: Math.max(elapsed - Math.max(timePaused ?? 0, 0), 0) };
      }
    }
  } catch (err) {
    // Silence date errors
  }
};

export const getDurationForUpdate = ({
  status,
  closedAt,
  createdAt,
  timePaused,
}: {
  closedAt: string;
  createdAt: CaseAttributes['created_at'];
  status?: CaseStatuses;
  timePaused?: number | null;
}): Pick<CaseAttributes, 'duration'> | undefined => {
  if (status && status === CaseStatuses.closed) {
    return getDurationInSeconds({ createdAt, closedAt, timePaused });
  }

  if (status && (status === CaseStatuses.open || status === CaseStatuses['in-progress'])) {
    return {
      duration: null,
    };
  }
};

export const getUserProfiles = async (
  securityStartPlugin: SecurityPluginStart,
  uids: Set<string>,
  dataPath?: string
): Promise<Map<string, UserProfileWithAvatar>> => {
  if (uids.size <= 0) {
    return new Map();
  }

  const userProfiles =
    (await securityStartPlugin.userProfiles.bulkGet({
      uids,
      dataPath,
    })) ?? [];

  return userProfiles.reduce<Map<string, UserProfileWithAvatar>>((acc, profile) => {
    acc.set(profile.uid, profile);
    return acc;
  }, new Map());
};

/**
 * Best-effort `getUserProfiles`: resolves profiles for `uids`, returning
 * `undefined` (not throwing) if the user-profiles service fails. A transient
 * `bulkGet` failure must not block case create/update — callers fall back to
 * storing assignees uid-only, and the read path still resolves identity live.
 */
export const getUserProfilesSafe = async (
  securityStartPlugin: SecurityPluginStart,
  uids: Set<string>,
  logger: Logger
): Promise<Map<string, UserProfileWithAvatar> | undefined> => {
  try {
    return await getUserProfiles(securityStartPlugin, uids);
  } catch (error) {
    logger.warn(
      `Failed to resolve assignee user profiles; storing assignees without identity: ${error}`
    );
    return undefined;
  }
};

/**
 * Maps resolved user profiles onto assignees, populating `username`,
 * `full_name` and `email`. Uids without a resolvable profile stay uid-only.
 * Pure — the profiles are fetched once by the caller so a bulk operation can
 * share a single `bulkGet`.
 */
export const applyProfilesToAssignees = (
  assignees: CaseAssignees,
  profiles: Map<string, UserProfileWithAvatar>
): CaseAssignees =>
  assignees.map(({ uid }) => {
    const profile = profiles.get(uid);

    if (!profile) {
      return { uid };
    }

    return {
      uid,
      username: profile.user.username ?? null,
      full_name: profile.user.full_name ?? null,
      email: profile.user.email ?? null,
    };
  });

/**
 * Resolves each assignee's `uid` to its identity via the user-profiles service
 * and returns the assignees with those fields populated. The caller gates
 * invocation on the `assigneeIdentity` config flag. Non-fatal: on a profile
 * lookup failure the original (uid-only) assignees are returned unchanged.
 */
export const populateAssigneesIdentity = async (
  securityStartPlugin: SecurityPluginStart,
  logger: Logger,
  assignees?: CaseAssignees
): Promise<CaseAssignees | undefined> => {
  if (assignees == null || assignees.length === 0) {
    return assignees;
  }

  const profiles = await getUserProfilesSafe(
    securityStartPlugin,
    new Set(assignees.map(({ uid }) => uid)),
    logger
  );

  return profiles ? applyProfilesToAssignees(assignees, profiles) : assignees;
};

export const fillMissingCustomFields = ({
  customFields = [],
  customFieldsConfiguration = [],
}: {
  customFields?: CaseRequestCustomFields;
  customFieldsConfiguration?: CustomFieldsConfiguration;
}): CaseRequestCustomFields => {
  const customFieldsKeys = new Set(customFields.map((customField) => customField.key));
  const missingCustomFields: CaseRequestCustomFields = [];

  // only populate with the default value required custom fields missing from the request
  for (const confCustomField of customFieldsConfiguration) {
    if (!customFieldsKeys.has(confCustomField.key)) {
      if (confCustomField?.defaultValue !== null && confCustomField?.defaultValue !== undefined) {
        missingCustomFields.push({
          key: confCustomField.key,
          type: confCustomField.type,
          value: confCustomField.defaultValue,
        } as CaseCustomField);
      } else if (!confCustomField.required) {
        missingCustomFields.push({
          key: confCustomField.key,
          type: confCustomField.type,
          value: null,
        } as CaseCustomField);
      } // else, missing required custom fields without default are not touched
    }
  }

  return [...customFields, ...missingCustomFields];
};

export const normalizeCreateCaseRequest = (
  request: CasePostRequest,
  customFieldsConfiguration?: CustomFieldsConfiguration
) => ({
  ...request,
  title: request.title.trim(),
  description: request.description.trim(),
  category: request.category?.trim() ?? null,
  tags: request.tags?.map((tag) => tag.trim()) ?? [],
  customFields: fillMissingCustomFields({
    customFields: request.customFields,
    customFieldsConfiguration,
  }),
});

export const isObservable = (observable: ObservablePost | Observable): observable is Observable =>
  'id' in observable && 'typeKey' in observable && 'value' in observable;

export const processObservables = (
  observablesMap: Map<string, Observable>,
  observable: ObservablePost | Observable
) => {
  const key = `${observable.typeKey}-${observable.value}`;
  const isExistingObservable = observablesMap.has(key);
  if (isExistingObservable) {
    return;
  }
  if (isObservable(observable)) {
    observablesMap.set(key, observable);
  } else {
    observablesMap.set(key, {
      ...observable,
      id: v4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
};

/**
 *
 * For cases that have extended fields, populates `extended_fields_labels` with a mapping from
 * storage keys (e.g., `priority_as_keyword`) to user-facing labels (e.g., "Priority"), and
 * `extended_fields_controls` with a mapping from the same storage keys to the field's control
 * type (e.g., `USER_PICKER`) — needed by any consumer that must parse a value (user picker,
 * checkbox group, toggle) rather than display it verbatim, without having to re-fetch or thread
 * through full field definitions itself.
 * Both come from the case's template `fieldDefinitions` (when present) merged with global
 * field-library definitions. Template entries win on key collision. Cases without extended
 * fields are returned unchanged.
 *
 * @param cases - Array of cases to enrich
 * @param templateSOs - Pre-fetched template saved objects
 * @param globalFields - Pre-parsed isGlobal inline field definitions (see
 *   `parseFieldDefinitionsToInlineFields`) — accepted already-parsed since callers typically
 *   need the same parsed list for extended-field filter/label-search resolution too.
 * @returns The enriched cases array, preserving original order
 */
export const enrichCasesWithFieldLabels = (
  cases: Case[],
  templateSOs: Array<SavedObject<Template>>,
  globalFields: readonly InlineField[] = []
): Case[] => {
  type EligibleCase = Case & {
    extended_fields: NonNullable<Case['extended_fields']>;
  };
  const isEligible = (c: Case): c is EligibleCase => c.extended_fields != null;

  const eligibleCases = cases.filter(isEligible);

  if (eligibleCases.length === 0) {
    return cases;
  }

  const globalLabelMap = Object.fromEntries(
    globalFields.map((field) => [
      getFieldSnakeKey(field.name, field.type),
      field.label ?? field.name,
    ])
  );
  const globalControlMap = Object.fromEntries(
    globalFields.map((field) => [getFieldSnakeKey(field.name, field.type), field.control])
  );

  const labelsByTemplateKey = new Map<string, Record<string, string>>();
  const controlsByTemplateKey = new Map<string, Record<string, string>>();
  for (const so of templateSOs) {
    const fieldDefinitions = so.attributes.fieldDefinitions ?? [];
    const templateKey = `${so.attributes.templateId}:${so.attributes.templateVersion}`;
    labelsByTemplateKey.set(
      templateKey,
      Object.fromEntries(
        fieldDefinitions.map((field) => [getFieldSnakeKey(field.name, field.type), field.label])
      )
    );
    controlsByTemplateKey.set(
      templateKey,
      Object.fromEntries(
        fieldDefinitions.map((field) => [getFieldSnakeKey(field.name, field.type), field.control])
      )
    );
  }

  const enrichedCasesById = new Map(
    eligibleCases.flatMap((c) => {
      const templateKey = c.template?.id != null ? `${c.template.id}:${c.template.version}` : null;
      const fieldKeyToLabel = {
        ...globalLabelMap,
        ...(templateKey != null ? labelsByTemplateKey.get(templateKey) ?? {} : {}),
      };
      if (Object.keys(fieldKeyToLabel).length === 0) {
        return [];
      }
      const fieldKeyToControl = {
        ...globalControlMap,
        ...(templateKey != null ? controlsByTemplateKey.get(templateKey) ?? {} : {}),
      };
      return [
        [
          c.id,
          {
            ...c,
            extended_fields_labels: fieldKeyToLabel,
            extended_fields_controls: fieldKeyToControl,
          },
        ],
      ];
    })
  );

  return cases.map((c) => enrichedCasesById.get(c.id) ?? c);
};
