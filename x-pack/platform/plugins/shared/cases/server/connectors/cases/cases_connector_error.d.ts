import { CaseError } from '../../common/error';
export declare class CasesConnectorError extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode: number);
}
export declare const isCasesConnectorError: (error: unknown) => error is CasesConnectorError;
export declare const isCasesClientError: (error: unknown) => error is CaseError;
export declare const createTaskUserError: (error: CasesConnectorError) => CasesConnectorError;
