export declare const getCaseRoute: () => import("../types").CaseRoute<Readonly<{} & {
    case_id: string;
}>, unknown, unknown>;
export declare const resolveCaseRoute: import("../types").CaseRoute<Readonly<{} & {
    case_id: string;
}>, Readonly<{} & {
    mode: "legacy" | "unified";
    includeComments: boolean;
}>, unknown>;
