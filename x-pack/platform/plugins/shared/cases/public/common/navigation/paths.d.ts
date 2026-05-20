import type { CASE_VIEW_PAGE_TABS } from '../../../common/types';
export declare const DEFAULT_BASE_PATH = "/cases";
export interface CaseViewPathSearchParams {
    tabId?: CASE_VIEW_PAGE_TABS;
}
export type CaseViewPathParams = {
    detailName: string;
    commentId?: string;
} & CaseViewPathSearchParams;
export declare const getCreateCasePath: (casesBasePath: string) => string;
export declare const getCasesConfigurePath: (casesBasePath: string) => string;
export declare const getCaseViewPath: (casesBasePath: string) => string;
export declare const getCaseViewWithCommentPath: (casesBasePath: string) => string;
export interface TemplateViewPathParams {
    templateId: string;
}
export declare const getCasesConfigureTemplatesPath: (casesBasePath: string) => string;
export declare const getCasesConfigureFieldLibraryPath: (casesBasePath: string) => string;
export declare const getCasesConfigureCreateTemplatePath: (casesBasePath: string) => string;
export declare const getCasesConfigureEditTemplatePath: (casesBasePath: string) => string;
export declare const generateConfigureTemplateEditPath: (params: TemplateViewPathParams) => string;
export declare const generateCaseViewPath: (params: CaseViewPathParams) => string;
