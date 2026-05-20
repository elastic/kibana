import type { SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_NAME, TRANSACTION_TYPE } from '../es_fields';
export declare const FILTER_OPTIONS: readonly ["service.name", "service.environment", "transaction.type", "transaction.name"];
export type FilterKey = (typeof FILTER_OPTIONS)[number];
export interface CustomLinkES {
    id?: string;
    '@timestamp'?: number;
    label: string;
    url: string;
    [SERVICE_NAME]?: string[];
    [SERVICE_ENVIRONMENT]?: string[];
    [TRANSACTION_NAME]?: string[];
    [TRANSACTION_TYPE]?: string[];
}
export interface Filter {
    id?: string;
    key: FilterKey | '';
    value: string;
}
export interface CustomLink {
    id?: string;
    '@timestamp'?: number;
    label: string;
    url: string;
    filters?: Filter[];
}
