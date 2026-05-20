import type { CustomRuleEditorSource } from '../constants/usage_collection';
export type CustomRuleEditorOpenedEventName = `custom_rule_editor_opened_${CustomRuleEditorSource}`;
export declare const getCustomRuleEditorOpenedEventName: (source: CustomRuleEditorSource) => CustomRuleEditorOpenedEventName;
