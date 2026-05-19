import type { SpaceSettingsSOAttributes } from '../../types';
export declare function getSpaceSettings(spaceId?: string): Promise<{
    allowed_namespace_prefixes: string[];
    managed_by: "kibana_config" | undefined;
}>;
export declare function saveSpaceSettings({ settings, spaceId, managedBy, }: {
    settings: Partial<SpaceSettingsSOAttributes>;
    spaceId?: string;
    managedBy?: 'kibana_config';
}): Promise<void>;
