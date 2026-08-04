import type { AppHeaderMenu } from '@kbn/app-header';
import type { Rule, RuleType } from '../../../../types';
interface UseRuleDetailsAppMenuArgs {
    rule: Rule;
    ruleType: RuleType;
    /** Whether the user can manage the rule (mirrors the old `canSaveRule` gate on the actions menu). */
    canSaveRule: boolean;
    /** Whether the rule/actions are editable from within Rules Management. */
    canEdit: boolean;
    /** Whether the edit action should be disabled (e.g. rule type not enabled in the current license). */
    isEditDisabled: boolean;
    isInternallyManaged: boolean;
    onRunRule: (ruleId: string) => void;
    onEnableDisable: (enable: boolean) => void;
    onSnooze: () => void;
    onApiKeyUpdate: (ruleId: string) => void;
    onEdit: (ruleId: string) => void;
    onDelete: (ruleId: string) => void;
}
/**
 * Builds the App Header `menu` for the rule details page. It folds the former header actions popover
 * (`RuleActionsPopover`) and the standalone "View in Discover", "View linked object" and "Inspect"
 * header buttons into a single `AppMenuConfig`.
 */
export declare const useRuleDetailsAppMenu: ({ rule, ruleType, canSaveRule, canEdit, isEditDisabled, isInternallyManaged, onRunRule, onEnableDisable, onSnooze, onApiKeyUpdate, onEdit, onDelete, }: UseRuleDetailsAppMenuArgs) => AppHeaderMenu;
export {};
