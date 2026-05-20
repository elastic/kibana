import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { IUiSettingsClient } from '@kbn/core/server';
import type { StreamsServer } from '../../types';
export declare function assertSignificantEventsAccess({ server, licensing, uiSettingsClient, }: {
    server: StreamsServer;
    licensing: LicensingPluginStart;
    uiSettingsClient: IUiSettingsClient;
}): Promise<void>;
