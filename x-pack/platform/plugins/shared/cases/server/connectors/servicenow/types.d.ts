import type { ICasesConnector } from '../types';
interface CorrelationValues {
    correlation_id: string | null;
    correlation_display: string | null;
}
export interface ServiceNowSIRFieldsType extends CorrelationValues {
    dest_ip: string[] | null;
    source_ip: string[] | null;
    category: string | null;
    subcategory: string | null;
    malware_hash: string[] | null;
    malware_url: string[] | null;
    priority: string | null;
    additional_fields: string | null;
}
export type SirFieldKey = 'dest_ip' | 'source_ip' | 'malware_hash' | 'malware_url';
export type AlertFieldMappingAndValues = Record<string, {
    alertPath: string;
    sirFieldKey: SirFieldKey;
    add: boolean;
}>;
export interface ServiceNowITSMFieldsTypeConnector extends CorrelationValues {
    impact: string | null;
    severity: string | null;
    urgency: string | null;
    category: string | null;
    subcategory: string | null;
    additional_fields: string | null;
}
export type ServiceNowITSMCasesConnector = ICasesConnector<ServiceNowITSMFieldsTypeConnector>;
export type ServiceNowITSMFormat = ICasesConnector<ServiceNowITSMFieldsTypeConnector>['format'];
export type ServiceNowITSMGetMapping = ICasesConnector<ServiceNowITSMFieldsTypeConnector>['getMapping'];
export type ServiceNowSIRCasesConnector = ICasesConnector<ServiceNowSIRFieldsType>;
export type ServiceNowSIRFormat = ICasesConnector<ServiceNowSIRFieldsType>['format'];
export type ServiceNowSIRGetMapping = ICasesConnector<ServiceNowSIRFieldsType>['getMapping'];
export {};
