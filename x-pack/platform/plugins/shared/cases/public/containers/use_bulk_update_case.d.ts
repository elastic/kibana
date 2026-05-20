import type { ToastInputFields } from '@kbn/core/public';
import type { UpdateSummary } from '../../common/types/api';
import type { CaseUpdateRequest, CasesUI } from './types';
import type { ServerError } from '../types';
interface MutationArgs {
    cases: CaseUpdateRequest[];
    successToasterTitle?: string;
    originalCases: CasesUI;
    getUpdateSuccessToast?: (args: {
        updateSummary?: UpdateSummary[];
    }) => {
        title: string;
        text?: ToastInputFields['text'];
    };
}
/**
 * Executes bulk case updates and retries once on version conflicts caused only by
 * system-managed field drift.
 *
 * `cases` is the minimal patch payload sent to the API. `originalCases` is the
 * pre-update snapshot used to decide whether a 409 can be safely rebased with
 * fresh versions. `originalCases` may be a superset of `cases` when unchanged
 * selected cases are filtered out before the request; only matching ids are used
 * for the rebase check.
 */
export declare const useUpdateCases: () => import("@kbn/react-query").UseMutationResult<(Omit<{
    description: string;
    tags: string[];
    title: string;
    connector: {
        id: string;
        type: import("../../common").ConnectorTypes.casesWebhook;
        fields: null;
        name: string;
    } | {
        id: string;
        type: import("../../common").ConnectorTypes.jira;
        fields: {
            issueType: string | null;
            priority: string | null;
            parent: string | null;
            otherFields?: string | null | undefined;
        } | null;
        name: string;
    } | {
        id: string;
        type: import("../../common").ConnectorTypes.none;
        fields: null;
        name: string;
    } | {
        id: string;
        type: import("../../common").ConnectorTypes.resilient;
        fields: {
            incidentTypes: string[] | null;
            severityCode: string | null;
            additionalFields?: string | null | undefined;
        } | null;
        additionalFields?: string | null | undefined;
        name: string;
    } | {
        id: string;
        type: import("../../common").ConnectorTypes.serviceNowITSM;
        fields: {
            impact: string | null;
            severity: string | null;
            urgency: string | null;
            category: string | null;
            subcategory: string | null;
            additionalFields?: string | null | undefined;
        } | null;
        name: string;
    } | {
        id: string;
        type: import("../../common").ConnectorTypes.serviceNowSIR;
        fields: {
            category: string | null;
            destIp: boolean | null;
            malwareHash: boolean | null;
            malwareUrl: boolean | null;
            priority: string | null;
            sourceIp: boolean | null;
            subcategory: string | null;
            additionalFields?: string | null | undefined;
        } | null;
        name: string;
    } | {
        id: string;
        type: import("../../common").ConnectorTypes.swimlane;
        fields: {
            caseId: string | null;
        } | null;
        name: string;
    } | {
        id: string;
        type: import("../../common").ConnectorTypes.theHive;
        fields: {
            tlp: number | null;
        } | null;
        name: string;
    };
    severity: import("../../common").CaseSeverity;
    assignees: {
        uid: string;
    }[];
    category: string | null;
    customFields: ({
        key: string;
        type: import("../../common/types/domain").CustomFieldTypes.TEXT;
        value: string | null;
    } | {
        key: string;
        type: import("../../common/types/domain").CustomFieldTypes.TOGGLE;
        value: boolean | null;
    } | {
        key: string;
        type: import("../../common/types/domain").CustomFieldTypes.NUMBER;
        value: number | null;
    })[];
    settings: {
        syncAlerts: boolean;
        extractObservables?: boolean | undefined;
    };
    observables: {
        id: string;
        createdAt: string;
        updatedAt: string | null;
        typeKey: string;
        value: string;
        description: string | null;
    }[];
    status: import("@kbn/cases-components").CaseStatuses;
    owner: string;
    duration: number | null;
    closedAt: string | null;
    closedBy: {
        email: string | null | undefined;
        fullName: string | null | undefined;
        username: string | null | undefined;
        profileUid?: string | undefined;
    } | null;
    createdAt: string;
    createdBy: {
        email: string | null | undefined;
        fullName: string | null | undefined;
        username: string | null | undefined;
        profileUid?: string | undefined;
    };
    externalService: {
        connectorId: string;
        connectorName: string;
        externalId: string;
        externalTitle: string;
        externalUrl: string;
        pushedAt: string;
        pushedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        };
    } | null;
    updatedAt: string | null;
    updatedBy: {
        email: string | null | undefined;
        fullName: string | null | undefined;
        username: string | null | undefined;
        profileUid?: string | undefined;
    } | null;
    totalObservables: number | null;
    incrementalId?: number | null | undefined;
    inProgressAt?: string | null | undefined;
    timeToAcknowledge?: number | null | undefined;
    timeToInvestigate?: number | null | undefined;
    timeToResolve?: number | null | undefined;
    template?: {
        id: string;
        version: number;
    } | null | undefined;
    extendedFields?: {
        [x: string]: string;
    } | undefined;
    id: string;
    totalComment: number;
    totalAlerts: number;
    totalEvents: number | undefined;
    version: string;
    comments?: ({
        comment: string;
        type: import("../../common").AttachmentType.user;
        owner: string;
        createdAt: string;
        createdBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        };
        pushedAt: string | null;
        pushedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        updatedAt: string | null;
        updatedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        id: string;
        version: string;
    } | {
        type: import("../../common").AttachmentType.alert;
        alertId: string | string[];
        index: string | string[];
        rule: {
            id: string | null;
            name: string | null;
        };
        owner: string;
        createdAt: string;
        createdBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        };
        pushedAt: string | null;
        pushedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        updatedAt: string | null;
        updatedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        id: string;
        version: string;
    } | {
        type: import("../../common").AttachmentType.event;
        eventId: string | string[];
        index: string | string[];
        owner: string;
        createdAt: string;
        createdBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        };
        pushedAt: string | null;
        pushedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        updatedAt: string | null;
        updatedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        id: string;
        version: string;
    } | {
        type: import("../../common").AttachmentType.actions;
        comment: string;
        actions: {
            targets: {
                hostname: string;
                endpointId: string;
            }[];
            type: string;
        };
        owner: string;
        createdAt: string;
        createdBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        };
        pushedAt: string | null;
        pushedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        updatedAt: string | null;
        updatedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        id: string;
        version: string;
    } | {
        externalReferenceId: string;
        externalReferenceStorage: {
            type: import("../../common").ExternalReferenceStorageType.elasticSearchDoc;
        };
        externalReferenceAttachmentTypeId: string;
        externalReferenceMetadata: {
            [x: string]: string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | /*elided*/ any | null;
            } | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
        } | null;
        type: import("../../common").AttachmentType.externalReference;
        owner: string;
        createdAt: string;
        createdBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        };
        pushedAt: string | null;
        pushedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        updatedAt: string | null;
        updatedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        id: string;
        version: string;
    } | {
        externalReferenceId: string;
        externalReferenceStorage: {
            type: import("../../common").ExternalReferenceStorageType.savedObject;
            soType: string;
        };
        externalReferenceAttachmentTypeId: string;
        externalReferenceMetadata: {
            [x: string]: string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | /*elided*/ any | null;
            } | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
        } | null;
        type: import("../../common").AttachmentType.externalReference;
        owner: string;
        createdAt: string;
        createdBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        };
        pushedAt: string | null;
        pushedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        updatedAt: string | null;
        updatedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        id: string;
        version: string;
    } | {
        type: import("../../common").AttachmentType.persistableState;
        owner: string;
        persistableStateAttachmentTypeId: string;
        persistableStateAttachmentState: {
            [x: string]: string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | /*elided*/ any | null;
            } | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
        };
        createdAt: string;
        createdBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        };
        pushedAt: string | null;
        pushedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        updatedAt: string | null;
        updatedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        id: string;
        version: string;
    } | {
        type: string;
        attachmentId: string | string[];
        owner: string;
        data?: {
            [x: string]: string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | /*elided*/ any | null;
            } | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
        } | null | undefined;
        metadata?: {
            [x: string]: string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | /*elided*/ any | null;
            } | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
        } | null | undefined;
        createdAt: string;
        createdBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        };
        pushedAt: string | null;
        pushedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        updatedAt: string | null;
        updatedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        id: string;
        version: string;
    } | {
        type: string;
        data: {
            [x: string]: string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | /*elided*/ any | null;
            } | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
        };
        owner: string;
        metadata?: {
            [x: string]: string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null;
            } | (string | number | boolean | {
                [x: string]: string | number | boolean | /*elided*/ any | /*elided*/ any | null;
            } | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
        } | null | undefined;
        createdAt: string;
        createdBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        };
        pushedAt: string | null;
        pushedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        updatedAt: string | null;
        updatedBy: {
            email: string | null | undefined;
            fullName: string | null | undefined;
            username: string | null | undefined;
            profileUid?: string | undefined;
        } | null;
        id: string;
        version: string;
    })[] | undefined;
    extendedFieldsLabels?: {
        [x: string]: string;
    } | undefined;
}, "comments"> & {
    comments: import("./types").AttachmentUIV2[];
} & {
    updateSummary?: UpdateSummary;
})[], ServerError, MutationArgs, unknown>;
export type UseUpdateCases = ReturnType<typeof useUpdateCases>;
export {};
