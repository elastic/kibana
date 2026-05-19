export type AlertingV2BreadcrumbPage = 'root' | 'rules_list' | 'create' | 'edit' | 'rule_details' | 'action_policies_list' | 'action_policy_create' | 'action_policy_edit' | 'rule_create_options' | 'episodes_list' | 'episode_details' | 'rule_doctor' | 'execution_history_list';
export declare const getAlertingV2Breadcrumb: (page: AlertingV2BreadcrumbPage, options?: {
    ruleName?: string;
}) => {
    text: string;
};
