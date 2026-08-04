import React from 'react';
interface Props {
    episodeId: string;
    /**
     * Episode start. Used as the lower bound for the execution-history query.
     */
    episodeStart?: string;
}
export declare const EpisodeActionPolicyHistoryTab: ({ episodeId, episodeStart }: Props) => React.JSX.Element;
export {};
