import type { ValidatorServices } from '../../types';
export declare const assertURL: (url: string) => void;
export declare const urlAllowListValidator: <T>(urlKey: string) => (obj: T, validatorServices: ValidatorServices) => void;
