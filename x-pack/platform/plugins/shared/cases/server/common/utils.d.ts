import type { SavedObjectsFindResult, SavedObjectsFindResponse, SavedObject, SavedObjectReference, IBasePath } from '@kbn/core/server';
import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import type { ActionsAttachmentPayload, AlertAttachmentPayload, AttachmentV2, AttachmentAttributes, AttachmentAttributesV2, Case, EventAttachmentPayload, User, UserCommentAttachmentPayload } from '../../common/types/domain';
import { CaseStatuses, ConnectorTypes } from '../../common/types/domain';
import { OWNER_INFO } from '../../common/constants';
import type { CASE_VIEW_PAGE_TABS } from '../../common/types';
import type { AlertInfo, FileAttachmentRequest } from './types';
import type { UpdateAlertStatusRequest } from '../client/alerts/types';
import type { CaseSavedObjectTransformed, CaseTransformedAttributes } from './types/case';
import type { AttachmentRequest, AttachmentRequestV2, AttachmentsFindResponseV2, CasePostRequest, CasesFindResponse } from '../../common/types/api';
/**
 * Default sort field for querying saved objects.
 */
export declare const defaultSortField = "created_at";
/**
 * Default unknown user
 */
export declare const nullUser: User;
export declare const transformNewCase: ({ user, newCase, }: {
    user: User;
    newCase: CasePostRequest;
}) => CaseTransformedAttributes;
export declare const transformCases: ({ casesMap, countOpenCases, countInProgressCases, countClosedCases, page, perPage, total, }: {
    casesMap: Map<string, Case>;
    countOpenCases: number;
    countInProgressCases: number;
    countClosedCases: number;
    page: number;
    perPage: number;
    total: number;
}) => CasesFindResponse;
export declare const flattenCaseSavedObject: ({ savedObject, comments, totalComment, totalAlerts, totalEvents, }: {
    savedObject: CaseSavedObjectTransformed;
    comments?: Array<SavedObject<AttachmentAttributesV2>>;
    totalComment?: number;
    totalAlerts?: number;
    totalEvents?: number;
}) => Case;
export declare const transformComments: (comments: SavedObjectsFindResponse<AttachmentAttributesV2>) => AttachmentsFindResponseV2;
export declare const flattenAttachmentSavedObjects: (savedObjects: Array<SavedObject<AttachmentAttributesV2>>) => AttachmentV2[];
export declare const flattenAttachmentSavedObject: (savedObject: SavedObject<AttachmentAttributesV2>) => AttachmentV2;
export declare const getIDsAndIndicesAsArrays: (comment: AttachmentRequestV2) => {
    ids: string[];
    indices: string[];
};
/**
 * Builds an AlertInfo object accumulating the alert IDs and indices for the passed in alerts.
 */
export declare const getAlertInfoFromComments: (comments?: AttachmentRequestV2[]) => AlertInfo[];
export type NewCommentArgs = AttachmentRequestV2 & {
    createdDate: string;
    owner: string;
    email?: string | null;
    full_name?: string | null;
    username?: string | null;
    profile_uid?: string;
};
export declare const transformNewComment: ({ createdDate, email, full_name, username, profile_uid: profileUid, ...comment }: NewCommentArgs) => AttachmentAttributesV2;
/**
 * A type narrowing function for actions comments.
 */
export declare const isCommentRequestTypeActions: (context: AttachmentRequest) => context is ActionsAttachmentPayload;
/**
 * A type narrowing function for alert comments.
 */
export declare const isCommentRequestTypeAlert: (context: AttachmentRequest) => context is AlertAttachmentPayload;
/**
 * A type narrowing function for event comments.
 */
export declare const isCommentRequestTypeEvent: (context: AttachmentRequest) => context is EventAttachmentPayload;
/**
 * Returns true if a Comment Request is trying to create either a persistableState or an
 * externalReference attachment.
 */
export declare const isPersistableStateOrExternalReference: (context: AttachmentRequest) => boolean;
/**
 * A type narrowing function for file attachments.
 */
export declare const isFileAttachmentRequest: (context: Partial<AttachmentRequest>) => context is FileAttachmentRequest;
/**
 * Adds the ids and indices to a map of statuses
 */
export declare function createAlertUpdateStatusRequest({ comment, status, closingReason, }: {
    comment: AttachmentRequestV2;
    status: CaseStatuses;
    closingReason?: string;
}): UpdateAlertStatusRequest[];
/**
 * Counts the total alert IDs within a single comment.
 */
export declare const countAlerts: (comment: SavedObjectsFindResult<AttachmentAttributesV2>) => number;
/**
 * Count the number of alerts for each id in the alert's references.
 */
export declare const groupTotalAlertsByID: ({ comments, }: {
    comments: SavedObjectsFindResponse<AttachmentAttributes>;
}) => Map<string, number>;
/**
 * Counts the total alert IDs for a single case.
 */
export declare const countAlertsForID: ({ comments, id, }: {
    comments: SavedObjectsFindResponse<AttachmentAttributes>;
    id: string;
}) => number | undefined;
/**
 * Counts total events in a single case.
 */
export declare const countEventsForID: ({ comments, }: {
    comments: SavedObjectsFindResponse<AttachmentAttributes>;
}) => number | undefined;
/**
 * Returns a connector that indicates that no connector was set.
 *
 * @returns the 'none' connector
 */
export declare const getNoneCaseConnector: () => {
    id: string;
    name: string;
    type: ConnectorTypes;
    fields: null;
};
export declare const extractLensReferencesFromCommentString: (lensEmbeddableFactory: LensServerPluginSetup["lensEmbeddableFactory"], comment: string) => SavedObjectReference[];
export declare const getOrUpdateLensReferences: (lensEmbeddableFactory: LensServerPluginSetup["lensEmbeddableFactory"], newComment: string, currentComment?: SavedObject<UserCommentAttachmentPayload>) => SavedObjectReference[];
export declare const asArray: <T>(field?: T | T[] | null) => T[];
export declare const assertUnreachable: (x: never) => never;
export declare const getApplicationRoute: (appRouteInfo: { [K in keyof typeof OWNER_INFO]: {
    appRoute: string;
}; }, owner: string) => string;
export declare const getCaseViewPath: (params: {
    publicBaseUrl: NonNullable<IBasePath["publicBaseUrl"]>;
    spaceId: string;
    caseId: string;
    owner: string;
    commentId?: string;
    tabId?: CASE_VIEW_PAGE_TABS;
}) => string;
export declare const countUserAttachments: (attachments: Array<SavedObject<AttachmentAttributes>>) => number;
