import type { ServerError } from '../types';
export declare const useGetCaseConnectors: (caseId: string) => import("@kbn/react-query").UseQueryResult<{
    [x: string]: {
        push: {
            needsToBePushed: boolean;
            hasBeenPushed: boolean;
            details?: {
                latestUserActionPushDate: string;
                oldestUserActionPushDate: string;
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
                };
            } | undefined;
        };
        id: string;
        type: import("../../common").ConnectorTypes.casesWebhook;
        fields: null;
        name: string;
    } | {
        push: {
            needsToBePushed: boolean;
            hasBeenPushed: boolean;
            details?: {
                latestUserActionPushDate: string;
                oldestUserActionPushDate: string;
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
                };
            } | undefined;
        };
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
        push: {
            needsToBePushed: boolean;
            hasBeenPushed: boolean;
            details?: {
                latestUserActionPushDate: string;
                oldestUserActionPushDate: string;
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
                };
            } | undefined;
        };
        id: string;
        type: import("../../common").ConnectorTypes.none;
        fields: null;
        name: string;
    } | {
        push: {
            needsToBePushed: boolean;
            hasBeenPushed: boolean;
            details?: {
                latestUserActionPushDate: string;
                oldestUserActionPushDate: string;
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
                };
            } | undefined;
        };
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
        push: {
            needsToBePushed: boolean;
            hasBeenPushed: boolean;
            details?: {
                latestUserActionPushDate: string;
                oldestUserActionPushDate: string;
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
                };
            } | undefined;
        };
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
        push: {
            needsToBePushed: boolean;
            hasBeenPushed: boolean;
            details?: {
                latestUserActionPushDate: string;
                oldestUserActionPushDate: string;
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
                };
            } | undefined;
        };
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
        push: {
            needsToBePushed: boolean;
            hasBeenPushed: boolean;
            details?: {
                latestUserActionPushDate: string;
                oldestUserActionPushDate: string;
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
                };
            } | undefined;
        };
        id: string;
        type: import("../../common").ConnectorTypes.swimlane;
        fields: {
            caseId: string | null;
        } | null;
        name: string;
    } | {
        push: {
            needsToBePushed: boolean;
            hasBeenPushed: boolean;
            details?: {
                latestUserActionPushDate: string;
                oldestUserActionPushDate: string;
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
                };
            } | undefined;
        };
        id: string;
        type: import("../../common").ConnectorTypes.theHive;
        fields: {
            tlp: number | null;
        } | null;
        name: string;
    };
}, ServerError>;
export type UseGetCaseConnectors = ReturnType<typeof useGetCaseConnectors>;
