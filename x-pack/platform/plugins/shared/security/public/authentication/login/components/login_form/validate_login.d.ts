interface LoginValidatorOptions {
    shouldValidate?: boolean;
}
export interface LoginValidationResult {
    isInvalid: boolean;
    error?: string;
}
export declare class LoginValidator {
    private shouldValidate?;
    constructor(options?: LoginValidatorOptions);
    enableValidation(): void;
    disableValidation(): void;
    validateUsername(username: string): LoginValidationResult;
    validatePassword(password: string): LoginValidationResult;
    validateForLogin(username: string, password: string): LoginValidationResult;
}
export {};
