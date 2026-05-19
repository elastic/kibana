import type { SavedObjectsClientContract, SavedObjectsUpdateOptions } from '@kbn/core/server';
import type { Settings, BaseSettings } from '../../common/types';
import type { SettingsSOAttributes } from '../types';
export declare function getSettings(soClient: SavedObjectsClientContract): Promise<Settings>;
export declare function getSettingsOrUndefined(soClient: SavedObjectsClientContract): Promise<Settings | undefined>;
export declare function settingsSetup(soClient: SavedObjectsClientContract): Promise<(Partial<Settings> & Pick<Settings, "id">) | undefined>;
export declare function saveSettings(soClient: SavedObjectsClientContract, newData: Partial<Omit<Settings, 'id'>>, options?: SavedObjectsUpdateOptions<SettingsSOAttributes> & {
    createWithOverwrite?: boolean;
    fromSetup?: boolean;
}): Promise<Partial<Settings> & Pick<Settings, 'id'>>;
export declare function createDefaultSettings(): BaseSettings;
