export type TemplateType = 'default' | 'managed' | 'cloudManaged' | 'system';
export declare const IndexMode: {
    readonly standard: "standard";
    readonly logsdb: "logsdb";
    readonly time_series: "time_series";
    readonly lookup: "lookup";
};
export type IndexMode = (typeof IndexMode)[keyof typeof IndexMode];
export interface DataRetention {
    enabled: boolean;
    infiniteDataRetention?: boolean;
    value?: number;
    unit?: string;
}
/**
 * Interface for the template list returned by Index Management's
 * `GET /api/index_management/index_templates` endpoint.
 *
 * This is a copy of the plugin's TemplateListItem interface with additional fields added during deserialization,
 * kept here to allow cross-plugin consumption without creating cyclic dependencies.
 */
export interface TemplateListItem {
    name: string;
    indexPatterns: string[];
    version?: number;
    order?: number;
    priority?: number;
    hasSettings: boolean;
    hasAliases: boolean;
    hasMappings: boolean;
    deprecated?: boolean;
    ilmPolicy?: {
        name: string;
    };
    composedOf?: string[];
    _kbnMeta: {
        type: TemplateType;
        hasDatastream: boolean;
        isLegacy?: boolean;
    };
    lifecycle?: DataRetention;
    ignoreMissingComponentTemplates?: string[];
    allowAutoCreate: string;
    indexMode?: IndexMode;
    _meta?: {
        [key: string]: any;
    };
    dataStream?: {
        hidden?: boolean;
        [key: string]: any;
    };
}
export interface GetIndexTemplatesResponse {
    templates: TemplateListItem[];
    legacyTemplates: TemplateListItem[];
}
