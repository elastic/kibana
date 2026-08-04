import React from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
interface AlertEpisodeRuleFilterProps {
    selectedRuleId?: string | null;
    onRuleChange: (ruleId: string | undefined) => void;
    ruleOptions: Array<{
        label: string;
        value: string;
    }>;
    services: {
        http: HttpStart;
    };
    'data-test-subj'?: string;
}
export declare function AlertEpisodesRuleFilter({ selectedRuleId, onRuleChange, ruleOptions, services: { http }, 'data-test-subj': dataTestSubj, }: AlertEpisodeRuleFilterProps): React.JSX.Element;
export {};
