import { z } from '@kbn/zod';
import type { IKbnUrlStateStorage, Storage } from '@kbn/kibana-utils-plugin/public';
/** Namespace for episodes table config inside the `_a` app-state blob */
export declare const EPISODES_TABLE_APP_STATE_KEY: "episodesTable";
/** localStorage key for all episodes table display options */
export declare const EPISODES_TABLE_CONFIG_STORAGE_KEY: "alertingV2.episodes.tableConfiguration";
/**
 * One field per persisted display option. Add more fields here as more options are persisted —
 * decode/encode below validate and serialize per-field automatically.
 */
declare const episodesTableConfigSchema: z.ZodObject<{
    visibleColumns: z.ZodArray<z.ZodString>;
    sort: z.ZodObject<{
        sortField: z.ZodString;
        sortDirection: z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>;
    }, z.core.$strip>;
    rowHeight: z.ZodNumber;
    columnSettings: z.ZodRecord<z.ZodString, z.ZodObject<{
        width: z.ZodOptional<z.ZodNumber>;
        display: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type EpisodesTableConfig = z.infer<typeof episodesTableConfigSchema>;
export type EpisodesTableColumnSettings = EpisodesTableConfig['columnSettings'];
export declare const DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS: string[];
export declare const DEFAULT_EPISODES_TABLE_SORT: EpisodesTableConfig['sort'];
export declare const DEFAULT_EPISODES_TABLE_COLUMN_SETTINGS: EpisodesTableColumnSettings;
export declare const DEFAULT_EPISODES_TABLE_CONFIG: EpisodesTableConfig;
/**
 * Merges table config from localStorage and URL, with URL winning per-field over localStorage,
 * and localStorage winning over the defaults.
 */
export declare const mergeEpisodesTableConfig: (fromStorage?: Partial<EpisodesTableConfig> | null, fromUrl?: Partial<EpisodesTableConfig> | null) => EpisodesTableConfig;
export declare const readEpisodesTableConfigFromStorage: (storage: Storage) => Partial<EpisodesTableConfig> | undefined;
export declare const writeEpisodesTableConfigToStorage: (storage: Storage, config: EpisodesTableConfig) => void;
export declare const readEpisodesTableConfigFromUrl: (urlStateStorage: IKbnUrlStateStorage) => Partial<EpisodesTableConfig> | undefined;
export declare const writeEpisodesTableConfigToUrl: (urlStateStorage: IKbnUrlStateStorage, config: EpisodesTableConfig) => Promise<void>;
export {};
