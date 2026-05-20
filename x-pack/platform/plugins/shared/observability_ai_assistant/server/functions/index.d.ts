import type { RegistrationCallback } from '../service/types';
export type FunctionRegistrationParameters = Omit<Parameters<RegistrationCallback>[0], 'registerContext' | 'hasFunction' | 'pluginsStart'>;
export declare const registerFunctions: RegistrationCallback;
