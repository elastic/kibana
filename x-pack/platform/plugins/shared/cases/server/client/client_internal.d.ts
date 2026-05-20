import type { CasesClientArgs } from './types';
import type { InternalConfigureSubClient } from './configure/client';
export declare class CasesClientInternal {
    private readonly _configuration;
    constructor(args: CasesClientArgs);
    get configuration(): InternalConfigureSubClient;
}
export declare const createCasesClientInternal: (args: CasesClientArgs) => CasesClientInternal;
