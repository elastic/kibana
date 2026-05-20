import * as rt from 'io-ts';
export declare const CreateCaseUserActionRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"create_case">;
}>>, rt.ExactC<rt.TypeC<{
    payload: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
        }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ConnectorTypes.jira>;
            fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                issueType: rt.UnionC<[rt.StringC, rt.NullC]>;
                priority: rt.UnionC<[rt.StringC, rt.NullC]>;
                parent: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.PartialC<{
                otherFields: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ConnectorTypes.resilient>;
            fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                incidentTypes: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.NullC]>;
                severityCode: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.PartialC<{
                additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ConnectorTypes.serviceNowITSM>;
            fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                impact: rt.UnionC<[rt.StringC, rt.NullC]>;
                severity: rt.UnionC<[rt.StringC, rt.NullC]>;
                urgency: rt.UnionC<[rt.StringC, rt.NullC]>;
                category: rt.UnionC<[rt.StringC, rt.NullC]>;
                subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.PartialC<{
                additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ConnectorTypes.serviceNowSIR>;
            fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                category: rt.UnionC<[rt.StringC, rt.NullC]>;
                destIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                malwareHash: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                malwareUrl: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                priority: rt.UnionC<[rt.StringC, rt.NullC]>;
                sourceIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.PartialC<{
                additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ConnectorTypes.theHive>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>]>]>;
    }>>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
            uid: rt.StringC;
        }>>>;
        description: rt.StringC;
        status: rt.StringC;
        severity: rt.StringC;
        tags: rt.ArrayC<rt.StringC>;
        title: rt.StringC;
        settings: rt.PartialC<{
            syncAlerts: rt.BooleanC;
            extractObservables: rt.BooleanC;
        }>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.PartialC<{
        category: rt.UnionC<[rt.StringC, rt.NullC]>;
        customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../..").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../..").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../..").CustomFieldTypes.NUMBER>;
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>]>>;
    }>>]>]>;
}>>]>;
export declare const CreateCaseUserActionWithoutConnectorIdRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"create_case">;
}>>, rt.ExactC<rt.TypeC<{
    payload: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        connector: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ConnectorTypes.jira>;
            fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                issueType: rt.UnionC<[rt.StringC, rt.NullC]>;
                priority: rt.UnionC<[rt.StringC, rt.NullC]>;
                parent: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.PartialC<{
                otherFields: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ConnectorTypes.resilient>;
            fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                incidentTypes: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.NullC]>;
                severityCode: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.PartialC<{
                additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ConnectorTypes.serviceNowITSM>;
            fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                impact: rt.UnionC<[rt.StringC, rt.NullC]>;
                severity: rt.UnionC<[rt.StringC, rt.NullC]>;
                urgency: rt.UnionC<[rt.StringC, rt.NullC]>;
                category: rt.UnionC<[rt.StringC, rt.NullC]>;
                subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.PartialC<{
                additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ConnectorTypes.serviceNowSIR>;
            fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                category: rt.UnionC<[rt.StringC, rt.NullC]>;
                destIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                malwareHash: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                malwareUrl: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                priority: rt.UnionC<[rt.StringC, rt.NullC]>;
                sourceIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.PartialC<{
                additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../..").ConnectorTypes.theHive>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>]>;
    }>>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
            uid: rt.StringC;
        }>>>;
        description: rt.StringC;
        status: rt.StringC;
        severity: rt.StringC;
        tags: rt.ArrayC<rt.StringC>;
        title: rt.StringC;
        settings: rt.PartialC<{
            syncAlerts: rt.BooleanC;
            extractObservables: rt.BooleanC;
        }>;
        owner: rt.StringC;
    }>>, rt.ExactC<rt.PartialC<{
        category: rt.UnionC<[rt.StringC, rt.NullC]>;
        customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../..").CustomFieldTypes.TEXT>;
            value: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../..").CustomFieldTypes.TOGGLE>;
            value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            key: rt.StringC;
            type: rt.LiteralC<import("../..").CustomFieldTypes.NUMBER>;
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>]>>;
    }>>]>]>;
}>>]>;
