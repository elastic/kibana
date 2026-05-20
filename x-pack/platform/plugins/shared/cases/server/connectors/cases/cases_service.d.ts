import type { CaseIdPayload } from './types';
export declare class CasesService {
    private cryptoService;
    constructor();
    getCaseId({ ruleId, spaceId, owner, grouping, counter }: CaseIdPayload): string;
}
