import type { CommandsByPlatform } from '../../../applications/fleet/components/fleet_server_instructions/utils/install_command_utils';
import type { DownloadSource, EnrollmentSettingsProxy } from '../../../types';
export declare const StandaloneInstructions: ({ agentVersion, downloadSource, downloadSourceProxy, }: {
    agentVersion: string;
    downloadSource?: DownloadSource;
    downloadSourceProxy?: EnrollmentSettingsProxy;
}) => CommandsByPlatform;
