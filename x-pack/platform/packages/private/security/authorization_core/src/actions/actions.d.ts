import type { Actions as ActionsType } from '@kbn/security-plugin-types-server';
import { AlertingActions } from './alerting';
import { ApiActions } from './api';
import { AppActions } from './app';
import { CasesActions } from './cases';
import { SavedObjectActions } from './saved_object';
import { SpaceActions } from './space';
import { UIActions } from './ui';
/** Actions are used to create the "actions" that are associated with Elasticsearch's
 * application privileges, and are used to perform the authorization checks implemented
 * by the various `checkPrivilegesWithRequest` derivatives.
 */
export declare class Actions implements ActionsType {
    readonly api: ApiActions;
    readonly app: AppActions;
    readonly cases: CasesActions;
    readonly login: string;
    readonly savedObject: SavedObjectActions;
    readonly alerting: AlertingActions;
    readonly space: SpaceActions;
    readonly ui: UIActions;
    constructor();
}
