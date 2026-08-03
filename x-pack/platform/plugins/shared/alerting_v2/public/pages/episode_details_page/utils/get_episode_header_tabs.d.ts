import type { AppHeaderTab } from '@kbn/app-header';
export type EpisodeDetailsMainPanel = 'overview' | 'metadata' | 'timeline' | 'action_policy_history';
export declare const getEpisodeHeaderTabs: ({ actualMainPanel, showRuleDependentUi, showActionPolicyHistory, onSelect, }: {
    actualMainPanel: EpisodeDetailsMainPanel;
    showRuleDependentUi: boolean;
    showActionPolicyHistory: boolean;
    onSelect: (panel: EpisodeDetailsMainPanel) => void;
}) => AppHeaderTab[];
