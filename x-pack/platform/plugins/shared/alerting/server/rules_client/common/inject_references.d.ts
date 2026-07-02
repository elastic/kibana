import type { SavedObjectReference, SavedObjectAttributes } from '@kbn/core/server';
import type { UntypedNormalizedRuleType } from '../../rule_type_registry';
import type { RawRule, RuleTypeParams } from '../../types';
import type { RuleDomain } from '../../application/rule/types';
export declare function injectReferencesIntoActions(alertId: string, actions: RawRule['actions'], references: SavedObjectReference[]): {
    id: string;
    group?: string | undefined;
    params: {
        [x: string]: any;
    };
    actionTypeId: string;
    uuid: string;
    frequency?: Readonly<{} & {
        summary: boolean;
        throttle: string | null;
        notifyWhen: "onActiveAlert" | "onThrottleInterval" | "onActionGroupChange";
    }> | undefined;
    alertsFilter?: Readonly<{
        query?: Readonly<{} & {
            filters: Readonly<{
                query?: Record<string, any> | undefined;
                $state?: Readonly<{} & {
                    store: import("@kbn/es-query-constants").FilterStateStore;
                }> | undefined;
            } & {
                meta: Readonly<{
                    type?: string | undefined;
                    index?: string | undefined;
                    key?: string | undefined;
                    value?: string | undefined;
                    disabled?: boolean | undefined;
                    group?: string | undefined;
                    field?: string | undefined;
                    params?: any;
                    alias?: string | null | undefined;
                    negate?: boolean | undefined;
                    controlledBy?: string | undefined;
                    isMultiIndex?: boolean | undefined;
                    relation?: "AND" | "OR" | undefined;
                } & {}>;
            }>[];
            kql: string;
            dsl: string;
        }> | undefined;
        timeframe?: Readonly<{} & {
            timezone: string;
            days: (2 | 1 | 4 | 5 | 3 | 6 | 7)[];
            hours: Readonly<{} & {
                end: string;
                start: string;
            }>;
        }> | undefined;
    } & {}> | undefined;
    useAlertDataForTemplate?: boolean | undefined;
}[];
export declare function injectReferencesIntoParams<Params extends RuleTypeParams, ExtractedParams extends RuleTypeParams>(ruleId: string, ruleType: UntypedNormalizedRuleType, ruleParams: SavedObjectAttributes | undefined, references: SavedObjectReference[]): Params;
export declare function injectReferencesIntoArtifacts(ruleId: string, artifacts?: RawRule['artifacts'], references?: SavedObjectReference[]): Required<RuleDomain['artifacts']>;
