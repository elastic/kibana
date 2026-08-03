import { type Reducer } from 'react';
import type { Role } from '@kbn/security-plugin-types-common';
export type IDispatchAction = {
    /** @description  updates the records of roles for a space */
    type: 'update_roles' | 'remove_roles';
    payload: Role[];
} | {
    /** @description  updates to true if user does not have privilege to view roles */
    type: 'fetch_roles_error';
    payload: boolean;
} | {
    type: 'string';
    payload: unknown;
};
export interface IEditSpaceStoreState {
    /** roles assigned to current space */
    roles: Map<string, Role>;
    /** track if there was an error on the attempt to fetch roles **/
    fetchRolesError: boolean;
}
export declare const createSpaceRolesReducer: Reducer<IEditSpaceStoreState, IDispatchAction>;
