export type CasesColumnsConfiguration = Record<string, {
    field: string;
    name: string;
    canDisplay: boolean;
    isCheckedDefault: boolean;
}>;
export declare const useCasesColumnsConfiguration: (isSelectorView?: boolean) => CasesColumnsConfiguration;
