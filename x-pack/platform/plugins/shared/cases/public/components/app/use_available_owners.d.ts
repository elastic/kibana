import type { CasesPermissions } from '../../containers/types';
type Capability = Exclude<keyof CasesPermissions, 'all'>;
/**
 *
 * @param capabilities : specifies the requirements for a valid owner, an owner will be included if it has the specified
 *  capabilities
 **/
export declare const useAvailableCasesOwners: (capabilities?: Capability[]) => string[];
export {};
