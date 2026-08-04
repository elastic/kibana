import { ApiOperation } from '@kbn/core-security-server';
import type { ApiActions as ApiActionsType } from '@kbn/security-plugin-types-server';
export declare class ApiActions implements ApiActionsType {
    private readonly prefix;
    constructor();
    private isValidOperation;
    actionFromRouteTag(routeTag: string): string;
    get(operation: string | ApiOperation, subject?: string): string;
}
