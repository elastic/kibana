export interface CasesSubActionParamsUI {
    timeWindow: string;
    reopenClosedCases: boolean;
    groupingBy: string[];
    templateId?: string | null;
    templateVersion?: string | null;
    autoPushCase?: boolean;
    maximumCasesToOpen?: number;
}
export interface CasesActionParams {
    subAction: string;
    subActionParams: CasesSubActionParamsUI;
}
