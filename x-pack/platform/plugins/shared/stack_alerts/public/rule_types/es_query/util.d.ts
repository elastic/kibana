import type { FieldOption } from '@kbn/triggers-actions-ui-plugin/public/common';
import type { estypes } from '@elastic/elasticsearch';
import type { EsQueryRuleParams, SearchType } from './types';
export declare const isSearchSourceRule: (ruleParams: EsQueryRuleParams) => ruleParams is EsQueryRuleParams<SearchType.searchSource>;
export declare const isEsqlQueryRule: (ruleParams: EsQueryRuleParams) => ruleParams is EsQueryRuleParams<SearchType.esqlQuery>;
export declare const convertRawRuntimeFieldtoFieldOption: (rawFields: Record<string, estypes.MappingRuntimeField>) => FieldOption[];
export declare const useTriggerUiActionServices: () => Partial<import("@kbn/core/public").CoreStart> & import("@kbn/triggers-actions-ui-plugin/public").TriggersAndActionsUiServices;
