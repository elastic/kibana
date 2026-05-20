import moment from 'moment';
export interface SavedObjectsTaggingClientConfigRawType {
    cache_refresh_interval: string;
}
export declare class SavedObjectsTaggingClientConfig {
    cacheRefreshInterval: moment.Duration;
    constructor(rawConfig: SavedObjectsTaggingClientConfigRawType);
}
