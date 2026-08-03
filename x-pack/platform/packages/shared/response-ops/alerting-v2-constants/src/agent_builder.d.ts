/** Namespace prefix for Alerting V2 Agent Builder tool ids. */
export declare const ALERTING_NAMESPACE = "platform.alerting";
/**
 * Tool ids exposed by the Alerting V2 Agent Builder skills
 * (`rule-management` and `action-policy-management`).
 */
export declare const ALERTING_TOOL_IDS: {
    readonly manageRule: string;
    readonly manageActionPolicy: string;
};
export declare const RULE_MANAGEMENT_SKILL_ID = "rule-management";
export declare const ACTION_POLICY_MANAGEMENT_SKILL_ID = "action-policy-management";
/**
 * Initial message sent to the Agent Builder when the user clicks "Create with
 * AI Agent" on the Alerting V2 rules list page / create-rule flyout.
 */
export declare const CREATE_WITH_AGENT_INITIAL_PROMPT = "Load the rule-management skill and help me create a new alerting v2 rule. Ask me what I want to monitor and guide me through the setup.";
