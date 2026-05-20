import type { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';
import { StatusError } from './status_error';
export declare class InsufficientPermissionsError extends StatusError {
    constructor(message: string, permissions: SecurityHasPrivilegesResponse);
}
