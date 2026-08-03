import React from 'react';
import type { AlertEpisodesKibanaServices } from '../../../episodes_kibana_services';
interface EpisodeTimelineTabProps {
    episodeId: string;
    groupHash: string | undefined;
    services: Pick<AlertEpisodesKibanaServices, 'data' | 'spaces' | 'userProfile'>;
}
export declare const EpisodeTimelineTab: ({ episodeId, groupHash, services }: EpisodeTimelineTabProps) => React.JSX.Element;
export {};
