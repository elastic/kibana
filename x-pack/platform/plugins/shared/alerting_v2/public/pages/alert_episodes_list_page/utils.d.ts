import type { DataTableRecord } from '@kbn/discover-utils';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
export declare const alertEpisodeToDataTableRecord: (row: AlertEpisode) => DataTableRecord;
