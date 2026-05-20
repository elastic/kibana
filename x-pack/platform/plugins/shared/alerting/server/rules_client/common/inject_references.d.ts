import type { SavedObjectReference, SavedObjectAttributes } from '@kbn/core/server';
import type { UntypedNormalizedRuleType } from '../../rule_type_registry';
import type { RawRule, RuleTypeParams } from '../../types';
import type { RuleDomain } from '../../application/rule/types';
export declare function injectReferencesIntoActions(alertId: string, actions: RawRule['actions'], references: SavedObjectReference[]): {
    id: string;
    params: {
        [x: string]: any;
    };
    group?: string | undefined;
    uuid: string;
    frequency?: Readonly<{} & {
        summary: boolean;
        throttle: string | null;
        notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
    }> | undefined;
    actionTypeId: string;
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
                    field?: string | undefined;
                    value?: string | undefined;
                    params?: any;
                    disabled?: boolean | undefined;
                    group?: string | undefined;
                    alias?: string | null | undefined;
                    negate?: boolean | undefined;
                    relation?: "AND" | "OR" | undefined;
                    controlledBy?: string | undefined;
                    isMultiIndex?: boolean | undefined;
                } & {}>;
            }>[];
            kql: string;
            dsl: string;
        }> | undefined;
        timeframe?: Readonly<{} & {
            hours: Readonly<{} & {
                start: string;
                end: string;
            }>;
            days: (2 | 1 | 4 | 5 | 3 | 7 | 6)[];
            timezone: string;
        }> | undefined;
    } & {}> | undefined;
    useAlertDataForTemplate?: boolean | undefined;
}[];
export declare function injectReferencesIntoParams<Params extends RuleTypeParams, ExtractedParams extends RuleTypeParams>(ruleId: string, ruleType: UntypedNormalizedRuleType, ruleParams: SavedObjectAttributes | undefined, references: SavedObjectReference[]): Params;
export declare function injectReferencesIntoArtifacts(ruleId: string, artifacts?: RawRule['artifacts'], references?: SavedObjectReference[]): Required<RuleDomain['artifacts']>;
