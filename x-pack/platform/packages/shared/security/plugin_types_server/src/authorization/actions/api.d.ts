import type { ApiOperation } from '@kbn/core-security-server';
export interface ApiActions {
    get(operation: ApiOperation, subject: string): string;
    /**
     * @deprecated use `get(operation: ApiOperation, subject: string)` instead
     */
    get(subject: string): string;
    actionFromRouteTag(routeTag: string): string;
}
