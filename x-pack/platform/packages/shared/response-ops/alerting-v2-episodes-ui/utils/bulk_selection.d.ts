import type { AlertEpisode } from '../queries/episodes_query';
export declare const getEpisodesFromDocIds: (selectedDocIds: string[], episodesData: AlertEpisode[]) => AlertEpisode[];
export declare const uniqueGroupEpisodes: (episodes: AlertEpisode[]) => AlertEpisode[];
