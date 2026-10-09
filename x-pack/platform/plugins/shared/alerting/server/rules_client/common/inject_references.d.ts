import type { SavedObjectReference, SavedObjectAttributes } from '@kbn/core/server';
import type { UntypedNormalizedRuleType } from '../../rule_type_registry';
import type { RawRule, RuleTypeParams } from '../../types';
import type { RuleDomain } from '../../application/rule/types';
export declare function injectReferencesIntoActions(alertId: string, actions: RawRule['actions'], references: SavedObjectReference[]): {
    uuid: string;
    group?: string | undefined;
    actionTypeId: string;
    params: {
        [x: string]: any;
    };
    frequency?: Readonly<{} & {
        summary: boolean;
        notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
        throttle: string | null;
    }> | undefined;
    alertsFilter?: Readonly<{
        query?: Readonly<{} & {
            kql: string;
            filters: Readonly<{
                query?: Record<string, any> | undefined;
                $state?: Readonly<{} & {
                    store: import("@kbn/es-query-constants").FilterStateStore;
                }> | undefined;
            } & {
                meta: Readonly<{
                    alias?: string | null | undefined;
                    disabled?: boolean | undefined;
                    negate?: boolean | undefined;
                    controlledBy?: string | undefined;
                    group?: string | undefined;
                    index?: string | undefined;
                    isMultiIndex?: boolean | undefined;
                    type?: string | undefined;
                    key?: string | undefined;
                    params?: any;
                    value?: string | undefined;
                    field?: string | undefined;
                    relation?: "AND" | "OR" | undefined;
                } & {}>;
            }>[];
            dsl: string;
        }> | undefined;
        timeframe?: Readonly<{} & {
            days: (1 | 2 | 3 | 4 | 5 | 6 | 7)[];
            hours: Readonly<{} & {
                start: string;
                end: string;
            }>;
            timezone: string;
        }> | undefined;
    } & {}> | undefined;
    useAlertDataForTemplate?: boolean | undefined;
    id: string;
}[];
export declare function injectReferencesIntoParams<Params extends RuleTypeParams, ExtractedParams extends RuleTypeParams>(ruleId: string, ruleType: UntypedNormalizedRuleType, ruleParams: SavedObjectAttributes | undefined, references: SavedObjectReference[]): Params;
export declare function injectReferencesIntoArtifacts(ruleId: string, artifacts?: RawRule['artifacts'], references?: SavedObjectReference[]): Required<RuleDomain['artifacts']>;
