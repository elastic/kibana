import * as rt from 'io-ts';
declare const PushDetailsRt: rt.ExactC<rt.TypeC<{
    latestUserActionPushDate: rt.StringC;
    oldestUserActionPushDate: rt.StringC;
    externalService: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        connector_id: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        connector_name: rt.StringC;
        external_id: rt.StringC;
        external_title: rt.StringC;
        external_url: rt.StringC;
        pushed_at: rt.StringC;
        pushed_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
            username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        }>>, rt.ExactC<rt.PartialC<{
            profile_uid: rt.StringC;
        }>>]>;
    }>>]>;
}>>;
export declare const GetCaseConnectorsResponseRt: rt.RecordC<rt.StringC, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    push: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        needsToBePushed: rt.BooleanC;
        hasBeenPushed: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        details: rt.ExactC<rt.TypeC<{
            latestUserActionPushDate: rt.StringC;
            oldestUserActionPushDate: rt.StringC;
            externalService: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                connector_id: rt.StringC;
            }>>, rt.ExactC<rt.TypeC<{
                connector_name: rt.StringC;
                external_id: rt.StringC;
                external_title: rt.StringC;
                external_url: rt.StringC;
                pushed_at: rt.StringC;
                pushed_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                    email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                    full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                    username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
                }>>, rt.ExactC<rt.PartialC<{
                    profile_uid: rt.StringC;
                }>>]>;
            }>>]>;
        }>>;
    }>>]>;
}>>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    id: rt.StringC;
}>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../../domain/connector/v1").ConnectorTypes.casesWebhook>;
    fields: rt.NullC;
}>>, rt.ExactC<rt.TypeC<{
    name: rt.StringC;
}>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../../domain/connector/v1").ConnectorTypes.jira>;
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
    type: rt.LiteralC<import("../../domain/connector/v1").ConnectorTypes.none>;
    fields: rt.NullC;
}>>, rt.ExactC<rt.TypeC<{
    name: rt.StringC;
}>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../../domain/connector/v1").ConnectorTypes.resilient>;
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
    type: rt.LiteralC<import("../../domain/connector/v1").ConnectorTypes.serviceNowITSM>;
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
    type: rt.LiteralC<import("../../domain/connector/v1").ConnectorTypes.serviceNowSIR>;
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
    type: rt.LiteralC<import("../../domain/connector/v1").ConnectorTypes.swimlane>;
    fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
        caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.NullC]>;
}>>, rt.ExactC<rt.TypeC<{
    name: rt.StringC;
}>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<import("../../domain/connector/v1").ConnectorTypes.theHive>;
    fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
        tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>, rt.NullC]>;
}>>, rt.ExactC<rt.TypeC<{
    name: rt.StringC;
}>>]>]>]>]>>;
export declare const FindActionConnectorResponseRt: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    actionTypeId: rt.StringC;
    name: rt.StringC;
    isDeprecated: rt.BooleanC;
    isPreconfigured: rt.BooleanC;
    isSystemAction: rt.BooleanC;
    referencedByCount: rt.NumberC;
    isConnectorTypeDeprecated: rt.BooleanC;
}>>, rt.ExactC<rt.PartialC<{
    config: rt.RecordC<rt.StringC, rt.UnknownC>;
    isMissingSecrets: rt.BooleanC;
}>>]>>;
export declare const ConnectorMappingResponseRt: rt.ExactC<rt.TypeC<{
    id: rt.StringC;
    version: rt.StringC;
    mappings: rt.ArrayC<rt.ExactC<rt.TypeC<{
        action_type: rt.UnionC<[rt.LiteralC<"append">, rt.LiteralC<"nothing">, rt.LiteralC<"overwrite">]>;
        source: rt.UnionC<[rt.LiteralC<"title">, rt.LiteralC<"description">, rt.LiteralC<"comments">, rt.LiteralC<"tags">]>;
        target: rt.UnionC<[rt.StringC, rt.LiteralC<"not_mapped">]>;
    }>>>;
}>>;
export type ConnectorMappingResponse = rt.TypeOf<typeof ConnectorMappingResponseRt>;
export type GetCaseConnectorsResponse = rt.TypeOf<typeof GetCaseConnectorsResponseRt>;
export type GetCaseConnectorsPushDetails = rt.TypeOf<typeof PushDetailsRt>;
export {};
