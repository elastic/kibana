export interface ValidationError {
    code: string;
}
export type SharedValidationFunction = (value: unknown) => ValidationError | undefined;
export declare const createStringValidationFunction: (stringValidator: (value: string) => ValidationError | undefined) => SharedValidationFunction;
export declare const validateDomain: SharedValidationFunction;
export declare const validateGenericValue: SharedValidationFunction;
export declare const validateFilePath: SharedValidationFunction;
export declare const validateIp: (kind: "ipv6" | "ipv4") => SharedValidationFunction;
export declare const validateUrl: SharedValidationFunction;
export declare const validateEmail: SharedValidationFunction;
export declare const getValidatorForObservableType: (observableTypeKey: string | undefined) => SharedValidationFunction;
