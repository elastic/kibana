import React from 'react';
import type { EuiTitleSize } from '@elastic/eui';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '../../types/action';
import { type RuleState } from '../../types/rule_state';
export interface AlertEpisodeDetailsHeaderProps {
    isLoadingEpisode: boolean;
    ruleState: RuleState;
    status: AlertEpisodeStatus | undefined;
    severity: string | undefined | null;
    episodeAction: EpisodeActionState | undefined;
    groupAction: AlertEpisodeGroupAction | undefined;
    isFlapping?: boolean;
    titleSize?: EuiTitleSize;
}
export declare const AlertEpisodeDetailsHeader: ({ isLoadingEpisode, ruleState, status, severity, episodeAction, groupAction, isFlapping, titleSize, }: AlertEpisodeDetailsHeaderProps) => React.JSX.Element;
