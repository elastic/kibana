import type { ICasesDeepLinkId } from './deep_links';
import type { CaseViewPathParams, CaseViewPathSearchParams, TemplateViewPathParams } from './paths';
export declare const useCaseViewParams: () => CaseViewPathParams;
export declare function useUrlParams(): {
    urlParams: CaseViewPathSearchParams;
    toUrlParams: (params?: CaseViewPathSearchParams) => string;
};
type GetCasesUrl = (absolute?: boolean) => string;
type NavigateToCases = () => void;
type UseCasesNavigation = [GetCasesUrl, NavigateToCases];
export declare const useCasesNavigation: ({ path, deepLinkId, }: {
    path?: string;
    deepLinkId?: ICasesDeepLinkId;
}) => UseCasesNavigation;
export declare const useAllCasesNavigation: () => {
    getAllCasesUrl: GetCasesUrl;
    navigateToAllCases: NavigateToCases;
};
export declare const useCreateCaseNavigation: () => {
    getCreateCaseUrl: GetCasesUrl;
    navigateToCreateCase: NavigateToCases;
};
export declare const useConfigureCasesNavigation: () => {
    getConfigureCasesUrl: GetCasesUrl;
    navigateToConfigureCases: NavigateToCases;
};
export declare const useCasesTemplatesNavigation: () => {
    getCasesTemplatesUrl: GetCasesUrl;
    navigateToCasesTemplates: NavigateToCases;
};
export declare const useCasesCreateTemplateNavigation: () => {
    getCasesCreateTemplateUrl: GetCasesUrl;
    navigateToCasesCreateTemplate: NavigateToCases;
};
export declare const useCasesFieldLibraryNavigation: () => {
    getCasesFieldLibraryUrl: GetCasesUrl;
    navigateToCasesFieldLibrary: NavigateToCases;
};
export declare const useTemplateViewParams: () => TemplateViewPathParams;
type GetEditTemplateUrl = (pathParams: TemplateViewPathParams, absolute?: boolean) => string;
type NavigateToEditTemplate = (pathParams: TemplateViewPathParams) => void;
export declare const useCasesEditTemplateNavigation: () => {
    getCasesEditTemplateUrl: GetEditTemplateUrl;
    navigateToCasesEditTemplate: NavigateToEditTemplate;
};
type GetCaseViewUrl = (pathParams: CaseViewPathParams, absolute?: boolean) => string;
type NavigateToCaseView = (pathParams: CaseViewPathParams) => void;
export declare const useCaseViewNavigation: () => {
    getCaseViewUrl: GetCaseViewUrl;
    navigateToCaseView: NavigateToCaseView;
};
export {};
