import React from 'react';
import { type RuleResponse } from '@kbn/alerting-v2-schemas';
export interface AlertEpisodeRuleOverviewPanelProps {
    rule: RuleResponse;
    ruleDetailsHref: string;
}
export declare const AlertEpisodeRuleOverviewPanel: ({ rule, ruleDetailsHref, }: AlertEpisodeRuleOverviewPanelProps) => React.JSX.Element;
