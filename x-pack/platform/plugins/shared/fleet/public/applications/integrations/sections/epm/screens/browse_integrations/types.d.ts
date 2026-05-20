export declare const STATUS_DEPRECATED = "deprecated";
export type IntegrationStatusFilterType = typeof STATUS_DEPRECATED;
export declare const SETUP_METHOD_AGENTLESS = "agentless";
export declare const SETUP_METHOD_ELASTIC_AGENT = "elastic_agent";
export type SetupMethodFilterType = typeof SETUP_METHOD_AGENTLESS | typeof SETUP_METHOD_ELASTIC_AGENT;
import type { dataTypes } from '../../../../../../../common/constants';
export type SignalFilterType = (typeof dataTypes)[keyof typeof dataTypes];
export interface BrowseIntegrationsFilter {
    q?: string;
    sort?: BrowseIntegrationSortType;
    status?: IntegrationStatusFilterType[];
    setupMethod?: SetupMethodFilterType[];
    signal?: SignalFilterType[];
}
export type BrowseIntegrationSortType = 'recent-old' | 'old-recent' | 'a-z' | 'z-a';
