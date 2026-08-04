import type { Capabilities, IUiSettingsClient } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import type { SharePluginStart } from '@kbn/share-plugin/public';
/** Same window as Observability alert details “View in Discover” (+-15 minutes). */
export declare const DISCOVER_CONTEXT_HALF_WINDOW_MINUTES = 15;
/**
 * Absolute ISO time range centered on an episode / alert timestamp for opening Discover.
 */
export declare function getDiscoverTimeRangeAroundTimestamp(isoTimestamp: string | undefined): TimeRange | undefined;
export declare function getDiscoverHrefForRuleQuery({ share, capabilities, uiSettings, timeRange, ruleEsql, }: {
    share: SharePluginStart;
    capabilities: Capabilities;
    uiSettings: IUiSettingsClient;
    timeRange: TimeRange;
    ruleEsql: string | undefined;
}): string | undefined;
/**
 * Discover URL for a rule’s ES|QL in a ±30m window around an episode row timestamp.
 */
export declare function getDiscoverHrefForRuleAndEpisodeTimestamp({ share, capabilities, uiSettings, ruleEsql, episodeIsoTimestamp, }: {
    share: SharePluginStart;
    capabilities: Capabilities;
    uiSettings: IUiSettingsClient;
    ruleEsql: string | undefined;
    episodeIsoTimestamp: string | undefined;
}): string | undefined;
