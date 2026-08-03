import type { AlertEpisode } from '../queries/episodes_query';
export interface EpisodeActionContext {
    episodes: AlertEpisode[];
    /** Optional hook for the caller to refresh their data layer after a successful execute. */
    onSuccess?: () => void;
}
export interface EpisodeAction {
    id: string;
    order: number;
    displayName: string;
    iconType: string;
    isCompatible: (ctx: EpisodeActionContext) => boolean;
    execute: (ctx: EpisodeActionContext) => Promise<void>;
}
