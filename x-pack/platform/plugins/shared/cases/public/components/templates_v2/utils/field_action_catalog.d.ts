/**
 * The Validation and Conditional-logic entries the Actions menu offers for a field. Each entry knows
 * which block it writes to (`validation` / `display`), the rule key, and a scaffold value the author
 * then edits. `applyFieldBlock` (template_field_actions) consumes `blockKey`/`ruleKey`/`value`.
 */
export interface FieldRuleAction {
    id: string;
    label: string;
    blockKey: 'validation' | 'display';
    ruleKey: string;
    value: unknown;
}
/**
 * The validation rules worth offering for a control: the always-valid rules plus the type-specific
 * rules that actually take effect at runtime for that control (mirrors the editor's inapplicable-rule
 * validator, so the menu never scaffolds a rule the validator would then flag).
 */
export declare const getValidationActions: (control: string) => FieldRuleAction[];
/**
 * Conditional-logic entries — control-independent. `show_when` lives under `display`; `required_when`
 * lives under `validation` (it is a condition, so it is grouped here rather than under Validation).
 */
export declare const getConditionalLogicActions: () => FieldRuleAction[];
