import * as rt from 'io-ts';
export declare const ConnectorUserActionPayloadWithoutConnectorIdRt: rt.ExactC<rt.TypeC<{
    connector: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.casesWebhook>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.jira>;
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
        type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.none>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.resilient>;
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
        type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.serviceNowITSM>;
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
        type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.serviceNowSIR>;
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
        type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.swimlane>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.theHive>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>]>;
}>>;
export declare const ConnectorUserActionPayloadRt: rt.ExactC<rt.TypeC<{
    connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
    }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.casesWebhook>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.jira>;
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
        type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.none>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.resilient>;
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
        type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.serviceNowITSM>;
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
        type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.serviceNowSIR>;
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
        type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.swimlane>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.theHive>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>]>]>;
}>>;
export declare const ConnectorUserActionWithoutConnectorIdRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"connector">;
    payload: rt.ExactC<rt.TypeC<{
        connector: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.jira>;
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
            type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.resilient>;
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
            type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.serviceNowITSM>;
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
            type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.serviceNowSIR>;
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
            type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.theHive>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>]>;
    }>>;
}>>;
export declare const ConnectorUserActionRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"connector">;
    payload: rt.ExactC<rt.TypeC<{
        connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            id: rt.StringC;
        }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.casesWebhook>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.jira>;
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
            type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.none>;
            fields: rt.NullC;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.resilient>;
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
            type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.serviceNowITSM>;
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
            type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.serviceNowSIR>;
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
            type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.swimlane>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<import("../../connector/v1").ConnectorTypes.theHive>;
            fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>, rt.NullC]>;
        }>>, rt.ExactC<rt.TypeC<{
            name: rt.StringC;
        }>>]>]>]>;
    }>>;
}>>;
