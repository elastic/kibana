import type { AppDeepLink } from '@kbn/core/public';
export declare const CasesDeepLinkId: {
    readonly cases: "cases";
    readonly casesCreate: "cases_create";
    readonly casesConfigure: "cases_configure";
    readonly casesTemplates: "cases_templates";
};
export type ICasesDeepLinkId = (typeof CasesDeepLinkId)[keyof typeof CasesDeepLinkId];
export declare const getCasesDeepLinks: <T extends AppDeepLink = AppDeepLink>({ basePath, extend, templatesEnabled, }: {
    basePath?: string;
    extend?: Partial<Record<ICasesDeepLinkId, Partial<T>>>;
    templatesEnabled?: boolean;
}) => {
    id: "cases";
    path: string;
    deepLinks: (T & {
        id: ICasesDeepLinkId;
    })[];
    title: string;
    keywords?: T["keywords"] | undefined;
    visibleIn?: T["visibleIn"] | undefined;
    category?: T["category"] | undefined;
    order?: T["order"] | undefined;
    tooltip?: T["tooltip"] | undefined;
    euiIconType?: T["euiIconType"] | undefined;
    icon?: T["icon"] | undefined;
};
