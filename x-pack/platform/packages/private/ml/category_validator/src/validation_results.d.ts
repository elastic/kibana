import { CATEGORY_EXAMPLES_VALIDATION_STATUS } from '../common/constants/categorization';
import type { FieldExampleCheck, CategoryFieldExample } from '../common/types/categories';
export declare class ValidationResults {
    private _results;
    get results(): FieldExampleCheck[];
    get overallResult(): CATEGORY_EXAMPLES_VALIDATION_STATUS;
    private _resultExists;
    createTokenCountResult(examples: CategoryFieldExample[], sampleSize: number): void;
    createNoExamplesResult(): void;
    createNullValueResult(examples: Array<string | null | undefined>): void;
    createTooManyTokensResult(error: any, sampleSize: number): void;
    createPrivilegesErrorResult(error: any): void;
    createFailureToTokenize(message: string | undefined): void;
}
