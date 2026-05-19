import type { EuiStepStatus } from '@elastic/eui';
export declare const stringToInteger: (value?: string | number) => number | undefined;
export declare const stringToIntegerWithDefault: (value: string | number, defaultValue: number) => number;
export declare const getStepStatus: (step: number, currentStep: number) => EuiStepStatus;
export declare const checkTemplateExists: (templateId: string) => Promise<boolean>;
export declare const getYamlDefaultAsString: (rawDefault: unknown) => string;
