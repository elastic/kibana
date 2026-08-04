import * as rt from 'io-ts';
import type { ActionType as ConnectorActionType } from '@kbn/actions-plugin/common';
import type { ActionResult } from '@kbn/actions-plugin/server/types';
export type ActionConnector = ActionResult;
export type ActionTypeConnector = ConnectorActionType;
export declare enum ConnectorTypes {
    casesWebhook = ".cases-webhook",
    jira = ".jira",
    none = ".none",
    resilient = ".resilient",
    serviceNowITSM = ".servicenow",
    serviceNowSIR = ".servicenow-sir",
    swimlane = ".swimlane",
    theHive = ".thehive"
}
declare const ConnectorCasesWebhookTypeFieldsRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.casesWebhook>;
    fields: rt.NullC;
}>>;
/**
 * Jira
 */
export declare const JiraFieldsRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    issueType: rt.UnionC<[rt.StringC, rt.NullC]>;
    priority: rt.UnionC<[rt.StringC, rt.NullC]>;
    parent: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>, rt.ExactC<rt.PartialC<{
    otherFields: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>]>;
export type JiraFieldsType = rt.TypeOf<typeof JiraFieldsRt>;
declare const ConnectorJiraTypeFieldsRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.jira>;
    fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        issueType: rt.UnionC<[rt.StringC, rt.NullC]>;
        priority: rt.UnionC<[rt.StringC, rt.NullC]>;
        parent: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.ExactC<rt.PartialC<{
        otherFields: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.NullC]>;
}>>;
/**
 * Resilient
 */
export declare const ResilientFieldsRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    incidentTypes: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.NullC]>;
    severityCode: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>, rt.ExactC<rt.PartialC<{
    additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>]>;
export type ResilientFieldsType = rt.TypeOf<typeof ResilientFieldsRt>;
declare const ConnectorResilientTypeFieldsRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.resilient>;
    fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        incidentTypes: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.NullC]>;
        severityCode: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.ExactC<rt.PartialC<{
        additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.NullC]>;
}>>, rt.ExactC<rt.PartialC<{
    additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>]>;
/**
 * ServiceNow
 */
export declare const ServiceNowITSMFieldsRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    impact: rt.UnionC<[rt.StringC, rt.NullC]>;
    severity: rt.UnionC<[rt.StringC, rt.NullC]>;
    urgency: rt.UnionC<[rt.StringC, rt.NullC]>;
    category: rt.UnionC<[rt.StringC, rt.NullC]>;
    subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>, rt.ExactC<rt.PartialC<{
    additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>]>;
export type ServiceNowITSMFieldsType = rt.TypeOf<typeof ServiceNowITSMFieldsRt>;
declare const ConnectorServiceNowITSMTypeFieldsRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.serviceNowITSM>;
    fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        impact: rt.UnionC<[rt.StringC, rt.NullC]>;
        severity: rt.UnionC<[rt.StringC, rt.NullC]>;
        urgency: rt.UnionC<[rt.StringC, rt.NullC]>;
        category: rt.UnionC<[rt.StringC, rt.NullC]>;
        subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.ExactC<rt.PartialC<{
        additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.NullC]>;
}>>;
export declare const ServiceNowSIRFieldsRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    category: rt.UnionC<[rt.StringC, rt.NullC]>;
    destIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
    malwareHash: rt.UnionC<[rt.BooleanC, rt.NullC]>;
    malwareUrl: rt.UnionC<[rt.BooleanC, rt.NullC]>;
    priority: rt.UnionC<[rt.StringC, rt.NullC]>;
    sourceIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
    subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>, rt.ExactC<rt.PartialC<{
    additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>]>;
export type ServiceNowSIRFieldsType = rt.TypeOf<typeof ServiceNowSIRFieldsRt>;
declare const ConnectorServiceNowSIRTypeFieldsRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.serviceNowSIR>;
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
}>>;
/**
 * Swimlane
 */
export declare const SwimlaneFieldsRt: rt.ExactC<rt.TypeC<{
    caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>;
export declare enum SwimlaneConnectorType {
    All = "all",
    Alerts = "alerts",
    Cases = "cases"
}
export type SwimlaneFieldsType = rt.TypeOf<typeof SwimlaneFieldsRt>;
declare const ConnectorSwimlaneTypeFieldsRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.swimlane>;
    fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
        caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.NullC]>;
}>>;
/**
 * Thehive
 */
export declare const TheHiveFieldsRt: rt.ExactC<rt.TypeC<{
    tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>>;
export type TheHiveFieldsType = rt.TypeOf<typeof TheHiveFieldsRt>;
declare const ConnectorTheHiveTypeFieldsRt: rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.theHive>;
    fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
        tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>, rt.NullC]>;
}>>;
export declare const ConnectorTypeFieldsRt: rt.UnionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.casesWebhook>;
    fields: rt.NullC;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.jira>;
    fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        issueType: rt.UnionC<[rt.StringC, rt.NullC]>;
        priority: rt.UnionC<[rt.StringC, rt.NullC]>;
        parent: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.ExactC<rt.PartialC<{
        otherFields: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.NullC]>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.none>;
    fields: rt.NullC;
}>>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.resilient>;
    fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        incidentTypes: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.NullC]>;
        severityCode: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.ExactC<rt.PartialC<{
        additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.NullC]>;
}>>, rt.ExactC<rt.PartialC<{
    additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>]>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.serviceNowITSM>;
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
    type: rt.LiteralC<ConnectorTypes.serviceNowSIR>;
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
    type: rt.LiteralC<ConnectorTypes.swimlane>;
    fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
        caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.NullC]>;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.theHive>;
    fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
        tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>, rt.NullC]>;
}>>]>;
/**
 * This type represents the connector's format when it is encoded within a user action.
 */
export declare const CaseUserActionConnectorRt: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.casesWebhook>;
    fields: rt.NullC;
}>>, rt.ExactC<rt.TypeC<{
    name: rt.StringC;
}>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.jira>;
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
    type: rt.LiteralC<ConnectorTypes.none>;
    fields: rt.NullC;
}>>, rt.ExactC<rt.TypeC<{
    name: rt.StringC;
}>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.resilient>;
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
    type: rt.LiteralC<ConnectorTypes.serviceNowITSM>;
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
    type: rt.LiteralC<ConnectorTypes.serviceNowSIR>;
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
    type: rt.LiteralC<ConnectorTypes.swimlane>;
    fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
        caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.NullC]>;
}>>, rt.ExactC<rt.TypeC<{
    name: rt.StringC;
}>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.theHive>;
    fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
        tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>, rt.NullC]>;
}>>, rt.ExactC<rt.TypeC<{
    name: rt.StringC;
}>>]>]>;
export declare const CaseConnectorRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    id: rt.StringC;
}>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.casesWebhook>;
    fields: rt.NullC;
}>>, rt.ExactC<rt.TypeC<{
    name: rt.StringC;
}>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.jira>;
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
    type: rt.LiteralC<ConnectorTypes.none>;
    fields: rt.NullC;
}>>, rt.ExactC<rt.TypeC<{
    name: rt.StringC;
}>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.resilient>;
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
    type: rt.LiteralC<ConnectorTypes.serviceNowITSM>;
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
    type: rt.LiteralC<ConnectorTypes.serviceNowSIR>;
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
    type: rt.LiteralC<ConnectorTypes.swimlane>;
    fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
        caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.NullC]>;
}>>, rt.ExactC<rt.TypeC<{
    name: rt.StringC;
}>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<ConnectorTypes.theHive>;
    fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
        tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>, rt.NullC]>;
}>>, rt.ExactC<rt.TypeC<{
    name: rt.StringC;
}>>]>]>]>;
/**
 * Mappings
 */
declare const ConnectorMappingActionTypeRt: rt.UnionC<[rt.LiteralC<"append">, rt.LiteralC<"nothing">, rt.LiteralC<"overwrite">]>;
declare const ConnectorMappingSourceRt: rt.UnionC<[rt.LiteralC<"title">, rt.LiteralC<"description">, rt.LiteralC<"comments">, rt.LiteralC<"tags">]>;
declare const ConnectorMappingTargetRt: rt.UnionC<[rt.StringC, rt.LiteralC<"not_mapped">]>;
export declare const ConnectorMappingsRt: rt.ArrayC<rt.ExactC<rt.TypeC<{
    action_type: rt.UnionC<[rt.LiteralC<"append">, rt.LiteralC<"nothing">, rt.LiteralC<"overwrite">]>;
    source: rt.UnionC<[rt.LiteralC<"title">, rt.LiteralC<"description">, rt.LiteralC<"comments">, rt.LiteralC<"tags">]>;
    target: rt.UnionC<[rt.StringC, rt.LiteralC<"not_mapped">]>;
}>>>;
export declare const ConnectorMappingsAttributesRt: rt.ExactC<rt.TypeC<{
    mappings: rt.ArrayC<rt.ExactC<rt.TypeC<{
        action_type: rt.UnionC<[rt.LiteralC<"append">, rt.LiteralC<"nothing">, rt.LiteralC<"overwrite">]>;
        source: rt.UnionC<[rt.LiteralC<"title">, rt.LiteralC<"description">, rt.LiteralC<"comments">, rt.LiteralC<"tags">]>;
        target: rt.UnionC<[rt.StringC, rt.LiteralC<"not_mapped">]>;
    }>>>;
    owner: rt.StringC;
}>>;
export type ConnectorMappingsAttributes = rt.TypeOf<typeof ConnectorMappingsAttributesRt>;
export type ConnectorMappings = rt.TypeOf<typeof ConnectorMappingsRt>;
export type ConnectorMappingActionType = rt.TypeOf<typeof ConnectorMappingActionTypeRt>;
export type ConnectorMappingSource = rt.TypeOf<typeof ConnectorMappingSourceRt>;
export type ConnectorMappingTarget = rt.TypeOf<typeof ConnectorMappingTargetRt>;
export type CaseUserActionConnector = rt.TypeOf<typeof CaseUserActionConnectorRt>;
export type CaseConnector = rt.TypeOf<typeof CaseConnectorRt>;
export type ConnectorTypeFields = rt.TypeOf<typeof ConnectorTypeFieldsRt>;
export type ConnectorCasesWebhookTypeFields = rt.TypeOf<typeof ConnectorCasesWebhookTypeFieldsRt>;
export type ConnectorJiraTypeFields = rt.TypeOf<typeof ConnectorJiraTypeFieldsRt>;
export type ConnectorResilientTypeFields = rt.TypeOf<typeof ConnectorResilientTypeFieldsRt>;
export type ConnectorSwimlaneTypeFields = rt.TypeOf<typeof ConnectorSwimlaneTypeFieldsRt>;
export type ConnectorServiceNowITSMTypeFields = rt.TypeOf<typeof ConnectorServiceNowITSMTypeFieldsRt>;
export type ConnectorServiceNowSIRTypeFields = rt.TypeOf<typeof ConnectorServiceNowSIRTypeFieldsRt>;
export type ConnectorTheHiveTypeFields = rt.TypeOf<typeof ConnectorTheHiveTypeFieldsRt>;
export {};
