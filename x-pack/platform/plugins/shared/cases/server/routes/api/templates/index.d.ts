import type { ConfigType } from '../../../config';
/**
 * Register template routes conditionally, based on feature flag
 */
export declare const getTemplateRoutes: (config: ConfigType) => (import("../types").CaseRoute<unknown, unknown, unknown> | import("../types").CaseRoute<{}, {
    page: number;
    perPage: number;
    sortField: "name" | "owner" | "author" | "isDefault" | "fieldCount" | "templateId" | "templateVersion" | "deletedAt" | "usageCount" | "lastUsedAt" | "isLatest";
    sortOrder: "asc" | "desc";
    search: string;
    tags: string[];
    author: string[];
    owner: string[];
    isDeleted: boolean;
    isEnabled?: boolean | undefined;
}, {}> | import("../types").CaseRoute<Readonly<{} & {
    template_id: string;
}>, Readonly<{
    version?: number | undefined;
    includeDeleted?: boolean | undefined;
} & {}>, unknown> | import("../types").CaseRoute<Readonly<{} & {
    template_id: string;
}>, unknown, unknown> | import("../types").CaseRoute<unknown, unknown, Readonly<{} & {
    ids: string[];
}>>)[];
