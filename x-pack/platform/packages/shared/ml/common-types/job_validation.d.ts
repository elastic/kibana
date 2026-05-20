import type { ErrorType } from './errors';
export interface DatafeedValidationResponse {
    valid: boolean;
    documentsFound: boolean;
    error?: ErrorType;
}
