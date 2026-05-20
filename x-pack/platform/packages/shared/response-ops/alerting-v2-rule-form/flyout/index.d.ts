import React from 'react';
import type { RuleFormFlyoutProps } from './rule_form_flyout';
import type { DynamicRuleFormFlyoutProps } from './dynamic_rule_form_flyout';
declare const LazyRuleFormFlyout: React.LazyExoticComponent<({ push, onClose, isLoading, isSaveDisabled, children, }: RuleFormFlyoutProps) => React.JSX.Element>;
declare const LazyDynamicRuleFormFlyout: React.LazyExoticComponent<(props: DynamicRuleFormFlyoutProps) => React.JSX.Element>;
export { LazyDynamicRuleFormFlyout, LazyRuleFormFlyout };
/** Base flyout wrapper - use with DynamicRuleForm as children */
export declare const RuleFormFlyout: (props: RuleFormFlyoutProps) => React.JSX.Element;
/** Pre-composed flyout for Discover integration - syncs with external query changes */
export declare const DynamicRuleFormFlyout: (props: DynamicRuleFormFlyoutProps) => React.JSX.Element;
export type { RuleFormFlyoutProps } from './rule_form_flyout';
export type { DynamicRuleFormFlyoutProps } from './dynamic_rule_form_flyout';
export type * from '../form/types';
