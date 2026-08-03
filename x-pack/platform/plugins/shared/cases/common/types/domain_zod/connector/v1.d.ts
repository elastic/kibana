import { z } from '@kbn/zod/v4';
import { ConnectorTypes, SwimlaneConnectorType } from '../../domain/connector/v1';
export { ConnectorTypes, SwimlaneConnectorType };
export type { ActionConnector, ActionTypeConnector } from '../../domain/connector/v1';
/**
 * Jira
 */
export declare const JiraFieldsSchema: z.ZodObject<{
    issueType: z.ZodNullable<z.ZodString>;
    priority: z.ZodNullable<z.ZodString>;
    parent: z.ZodNullable<z.ZodString>;
    otherFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
/**
 * Resilient
 */
export declare const ResilientFieldsSchema: z.ZodObject<{
    incidentTypes: z.ZodNullable<z.ZodArray<z.ZodString>>;
    severityCode: z.ZodNullable<z.ZodString>;
    additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
/**
 * ServiceNow ITSM
 */
export declare const ServiceNowITSMFieldsSchema: z.ZodObject<{
    impact: z.ZodNullable<z.ZodString>;
    severity: z.ZodNullable<z.ZodString>;
    urgency: z.ZodNullable<z.ZodString>;
    category: z.ZodNullable<z.ZodString>;
    subcategory: z.ZodNullable<z.ZodString>;
    additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
/**
 * ServiceNow SIR
 */
export declare const ServiceNowSIRFieldsSchema: z.ZodObject<{
    category: z.ZodNullable<z.ZodString>;
    destIp: z.ZodNullable<z.ZodBoolean>;
    malwareHash: z.ZodNullable<z.ZodBoolean>;
    malwareUrl: z.ZodNullable<z.ZodBoolean>;
    priority: z.ZodNullable<z.ZodString>;
    sourceIp: z.ZodNullable<z.ZodBoolean>;
    subcategory: z.ZodNullable<z.ZodString>;
    additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
/**
 * Swimlane
 */
export declare const SwimlaneFieldsSchema: z.ZodObject<{
    caseId: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
/**
 * TheHive
 */
export declare const TheHiveFieldsSchema: z.ZodObject<{
    tlp: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>;
export declare const ConnectorTypeFieldsSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.casesWebhook>;
    fields: z.ZodNull;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.jira>;
    fields: z.ZodNullable<z.ZodObject<{
        issueType: z.ZodNullable<z.ZodString>;
        priority: z.ZodNullable<z.ZodString>;
        parent: z.ZodNullable<z.ZodString>;
        otherFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.none>;
    fields: z.ZodNull;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.resilient>;
    fields: z.ZodNullable<z.ZodObject<{
        incidentTypes: z.ZodNullable<z.ZodArray<z.ZodString>>;
        severityCode: z.ZodNullable<z.ZodString>;
        additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.serviceNowITSM>;
    fields: z.ZodNullable<z.ZodObject<{
        impact: z.ZodNullable<z.ZodString>;
        severity: z.ZodNullable<z.ZodString>;
        urgency: z.ZodNullable<z.ZodString>;
        category: z.ZodNullable<z.ZodString>;
        subcategory: z.ZodNullable<z.ZodString>;
        additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.serviceNowSIR>;
    fields: z.ZodNullable<z.ZodObject<{
        category: z.ZodNullable<z.ZodString>;
        destIp: z.ZodNullable<z.ZodBoolean>;
        malwareHash: z.ZodNullable<z.ZodBoolean>;
        malwareUrl: z.ZodNullable<z.ZodBoolean>;
        priority: z.ZodNullable<z.ZodString>;
        sourceIp: z.ZodNullable<z.ZodBoolean>;
        subcategory: z.ZodNullable<z.ZodString>;
        additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.swimlane>;
    fields: z.ZodNullable<z.ZodObject<{
        caseId: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.theHive>;
    fields: z.ZodNullable<z.ZodObject<{
        tlp: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>], "type">;
export declare const CaseUserActionConnectorSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.casesWebhook>;
    fields: z.ZodNull;
    name: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.jira>;
    fields: z.ZodNullable<z.ZodObject<{
        issueType: z.ZodNullable<z.ZodString>;
        priority: z.ZodNullable<z.ZodString>;
        parent: z.ZodNullable<z.ZodString>;
        otherFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    name: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.none>;
    fields: z.ZodNull;
    name: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.resilient>;
    fields: z.ZodNullable<z.ZodObject<{
        incidentTypes: z.ZodNullable<z.ZodArray<z.ZodString>>;
        severityCode: z.ZodNullable<z.ZodString>;
        additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    name: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.serviceNowITSM>;
    fields: z.ZodNullable<z.ZodObject<{
        impact: z.ZodNullable<z.ZodString>;
        severity: z.ZodNullable<z.ZodString>;
        urgency: z.ZodNullable<z.ZodString>;
        category: z.ZodNullable<z.ZodString>;
        subcategory: z.ZodNullable<z.ZodString>;
        additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    name: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.serviceNowSIR>;
    fields: z.ZodNullable<z.ZodObject<{
        category: z.ZodNullable<z.ZodString>;
        destIp: z.ZodNullable<z.ZodBoolean>;
        malwareHash: z.ZodNullable<z.ZodBoolean>;
        malwareUrl: z.ZodNullable<z.ZodBoolean>;
        priority: z.ZodNullable<z.ZodString>;
        sourceIp: z.ZodNullable<z.ZodBoolean>;
        subcategory: z.ZodNullable<z.ZodString>;
        additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    name: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.swimlane>;
    fields: z.ZodNullable<z.ZodObject<{
        caseId: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    name: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.theHive>;
    fields: z.ZodNullable<z.ZodObject<{
        tlp: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>>;
    name: z.ZodString;
}, z.core.$strip>], "type">;
/**
 * Connector shape for template definitions: `type` + `id` + per-type `fields`, without `name`
 * (resolved from `id` at create time). Reuses the per-type field blocks so connector shape has a
 * single source of truth.
 */
export declare const CaseConnectorWithoutNameSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.casesWebhook>;
    fields: z.ZodNull;
    id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.jira>;
    fields: z.ZodNullable<z.ZodObject<{
        issueType: z.ZodNullable<z.ZodString>;
        priority: z.ZodNullable<z.ZodString>;
        parent: z.ZodNullable<z.ZodString>;
        otherFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.none>;
    fields: z.ZodNull;
    id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.resilient>;
    fields: z.ZodNullable<z.ZodObject<{
        incidentTypes: z.ZodNullable<z.ZodArray<z.ZodString>>;
        severityCode: z.ZodNullable<z.ZodString>;
        additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.serviceNowITSM>;
    fields: z.ZodNullable<z.ZodObject<{
        impact: z.ZodNullable<z.ZodString>;
        severity: z.ZodNullable<z.ZodString>;
        urgency: z.ZodNullable<z.ZodString>;
        category: z.ZodNullable<z.ZodString>;
        subcategory: z.ZodNullable<z.ZodString>;
        additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.serviceNowSIR>;
    fields: z.ZodNullable<z.ZodObject<{
        category: z.ZodNullable<z.ZodString>;
        destIp: z.ZodNullable<z.ZodBoolean>;
        malwareHash: z.ZodNullable<z.ZodBoolean>;
        malwareUrl: z.ZodNullable<z.ZodBoolean>;
        priority: z.ZodNullable<z.ZodString>;
        sourceIp: z.ZodNullable<z.ZodBoolean>;
        subcategory: z.ZodNullable<z.ZodString>;
        additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.swimlane>;
    fields: z.ZodNullable<z.ZodObject<{
        caseId: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.theHive>;
    fields: z.ZodNullable<z.ZodObject<{
        tlp: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>>;
    id: z.ZodString;
}, z.core.$strip>], "type">;
export declare const CaseConnectorSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.casesWebhook>;
    fields: z.ZodNull;
    name: z.ZodString;
    id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.jira>;
    fields: z.ZodNullable<z.ZodObject<{
        issueType: z.ZodNullable<z.ZodString>;
        priority: z.ZodNullable<z.ZodString>;
        parent: z.ZodNullable<z.ZodString>;
        otherFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    name: z.ZodString;
    id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.none>;
    fields: z.ZodNull;
    name: z.ZodString;
    id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.resilient>;
    fields: z.ZodNullable<z.ZodObject<{
        incidentTypes: z.ZodNullable<z.ZodArray<z.ZodString>>;
        severityCode: z.ZodNullable<z.ZodString>;
        additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    name: z.ZodString;
    id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.serviceNowITSM>;
    fields: z.ZodNullable<z.ZodObject<{
        impact: z.ZodNullable<z.ZodString>;
        severity: z.ZodNullable<z.ZodString>;
        urgency: z.ZodNullable<z.ZodString>;
        category: z.ZodNullable<z.ZodString>;
        subcategory: z.ZodNullable<z.ZodString>;
        additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    name: z.ZodString;
    id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.serviceNowSIR>;
    fields: z.ZodNullable<z.ZodObject<{
        category: z.ZodNullable<z.ZodString>;
        destIp: z.ZodNullable<z.ZodBoolean>;
        malwareHash: z.ZodNullable<z.ZodBoolean>;
        malwareUrl: z.ZodNullable<z.ZodBoolean>;
        priority: z.ZodNullable<z.ZodString>;
        sourceIp: z.ZodNullable<z.ZodBoolean>;
        subcategory: z.ZodNullable<z.ZodString>;
        additionalFields: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    name: z.ZodString;
    id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.swimlane>;
    fields: z.ZodNullable<z.ZodObject<{
        caseId: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    name: z.ZodString;
    id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<ConnectorTypes.theHive>;
    fields: z.ZodNullable<z.ZodObject<{
        tlp: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>>;
    name: z.ZodString;
    id: z.ZodString;
}, z.core.$strip>], "type">;
/**
 * Mappings
 */
declare const ConnectorMappingActionTypeSchema: z.ZodUnion<readonly [z.ZodLiteral<"append">, z.ZodLiteral<"nothing">, z.ZodLiteral<"overwrite">]>;
declare const ConnectorMappingSourceSchema: z.ZodUnion<readonly [z.ZodLiteral<"title">, z.ZodLiteral<"description">, z.ZodLiteral<"comments">, z.ZodLiteral<"tags">]>;
declare const ConnectorMappingTargetSchema: z.ZodUnion<readonly [z.ZodString, z.ZodLiteral<"not_mapped">]>;
export declare const ConnectorMappingsSchema: z.ZodArray<z.ZodObject<{
    action_type: z.ZodUnion<readonly [z.ZodLiteral<"append">, z.ZodLiteral<"nothing">, z.ZodLiteral<"overwrite">]>;
    source: z.ZodUnion<readonly [z.ZodLiteral<"title">, z.ZodLiteral<"description">, z.ZodLiteral<"comments">, z.ZodLiteral<"tags">]>;
    target: z.ZodUnion<readonly [z.ZodString, z.ZodLiteral<"not_mapped">]>;
}, z.core.$strip>>;
export declare const ConnectorMappingsAttributesSchema: z.ZodObject<{
    mappings: z.ZodArray<z.ZodObject<{
        action_type: z.ZodUnion<readonly [z.ZodLiteral<"append">, z.ZodLiteral<"nothing">, z.ZodLiteral<"overwrite">]>;
        source: z.ZodUnion<readonly [z.ZodLiteral<"title">, z.ZodLiteral<"description">, z.ZodLiteral<"comments">, z.ZodLiteral<"tags">]>;
        target: z.ZodUnion<readonly [z.ZodString, z.ZodLiteral<"not_mapped">]>;
    }, z.core.$strip>>;
    owner: z.ZodString;
}, z.core.$strip>;
export type ConnectorMappingsAttributes = z.infer<typeof ConnectorMappingsAttributesSchema>;
export type ConnectorMappings = z.infer<typeof ConnectorMappingsSchema>;
export type ConnectorMappingActionType = z.infer<typeof ConnectorMappingActionTypeSchema>;
export type ConnectorMappingSource = z.infer<typeof ConnectorMappingSourceSchema>;
export type ConnectorMappingTarget = z.infer<typeof ConnectorMappingTargetSchema>;
export type CaseUserActionConnector = z.infer<typeof CaseUserActionConnectorSchema>;
export type CaseConnector = z.infer<typeof CaseConnectorSchema>;
export type CaseConnectorWithoutName = z.infer<typeof CaseConnectorWithoutNameSchema>;
export type ConnectorTypeFields = z.infer<typeof ConnectorTypeFieldsSchema>;
export type JiraFieldsType = z.infer<typeof JiraFieldsSchema>;
export type ResilientFieldsType = z.infer<typeof ResilientFieldsSchema>;
export type SwimlaneFieldsType = z.infer<typeof SwimlaneFieldsSchema>;
export type ServiceNowITSMFieldsType = z.infer<typeof ServiceNowITSMFieldsSchema>;
export type ServiceNowSIRFieldsType = z.infer<typeof ServiceNowSIRFieldsSchema>;
export type TheHiveFieldsType = z.infer<typeof TheHiveFieldsSchema>;
