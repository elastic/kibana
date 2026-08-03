import type { RegistryAlertTypeWithAuth } from '../../../../authorization';
import type { RulesClientContext } from '../../../../rules_client/types';
export interface ListRuleTypesOptions {
    /**
     * When true, the returned set additionally includes rule types the user is
     * authorized to read as alerts (the `alert` authorization entity), not only
     * those they can read/create as rules. This is used by alert views (e.g. the
     * Stack alerts page and the dashboard alert panel embeddable) that need the
     * list of rule types whose alerts the user can see, including alerts-only
     * users who hold `alert/get` but not `rule/*` privileges.
     */
    includeAlertViewableTypes?: boolean;
}
export declare function listRuleTypes(context: RulesClientContext, options?: ListRuleTypesOptions): Promise<RegistryAlertTypeWithAuth[]>;
