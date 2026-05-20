export interface IntegrationsURLParameters {
    searchString?: string;
    categoryId?: string;
    subCategoryId?: string;
    onlyAgentless?: boolean;
}
export declare const useBuildIntegrationsUrl: () => {
    initialSelectedCategory: string;
    initialSubcategory: string | undefined;
    initialOnlyAgentless: boolean;
    setUrlandPushHistory: ({ searchString, categoryId, subCategoryId, onlyAgentless, }: IntegrationsURLParameters) => void;
    setUrlandReplaceHistory: ({ searchString, categoryId, subCategoryId, onlyAgentless, }: IntegrationsURLParameters) => void;
    getHref: (page: import("../../../../../constants").StaticPage | import("../../../../../constants").DynamicPage, values?: import("../../../../../constants").DynamicPagePathValues) => string;
    getAbsolutePath: (path: string) => string;
    searchParam: string;
    addBasePath: (url: string) => string;
};
