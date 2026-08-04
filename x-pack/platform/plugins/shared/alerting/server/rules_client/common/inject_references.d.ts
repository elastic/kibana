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
        notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
        throttle: string | null;
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
                    value?: string | undefined;
                    type?: string | undefined;
                    index?: string | undefined;
                    params?: any;
                    key?: string | undefined;
                    alias?: string | null | undefined;
                    disabled?: boolean | undefined;
                    negate?: boolean | undefined;
                    controlledBy?: string | undefined;
                    group?: string | undefined;
                    isMultiIndex?: boolean | undefined;
                    field?: string | undefined;
                    relation?: "AND" | "OR" | undefined;
                } & {}>;
            }>[];
            kql: string;
            dsl: string;
        }> | undefined;
        timeframe?: Readonly<{} & {
            timezone: string;
            days: (1 | 2 | 3 | 5 | 4 | 6 | 7)[];
            hours: Readonly<{} & {
                start: string;
                end: string;
            }>;
        }> | undefined;
    } & {}> | undefined;
    useAlertDataForTemplate?: boolean | undefined;
}[];
export declare function injectReferencesIntoParams<Params extends RuleTypeParams, ExtractedParams extends RuleTypeParams>(ruleId: string, ruleType: UntypedNormalizedRuleType, ruleParams: SavedObjectAttributes | undefined, references: SavedObjectReference[]): Params;
export declare function injectReferencesIntoArtifacts(ruleId: string, artifacts?: RawRule['artifacts'], references?: SavedObjectReference[]): Required<RuleDomain['artifacts']>;
