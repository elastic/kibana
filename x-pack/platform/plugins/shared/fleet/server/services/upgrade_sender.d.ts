import type { Logger } from '@kbn/core/server';
import type { DiscoveryDataset } from '../../common/types';
import type { TelemetryEventsSender } from '../telemetry/sender';
import type { InstallType } from '../types';
export interface PackageUpdateEvent {
    packageName: string;
    currentVersion: string;
    newVersion: string;
    status: 'success' | 'failure';
    dryRun?: boolean;
    errorMessage?: string[] | string;
    error?: UpgradeError[];
    eventType: UpdateEventType;
    installType?: InstallType;
    packageType?: string;
    discoveryDatasets?: DiscoveryDataset[];
    automaticInstall?: boolean;
    latestExecutedState?: {
        name: string;
        error?: string;
    };
}
export declare enum UpdateEventType {
    PACKAGE_POLICY_UPGRADE = "package-policy-upgrade",
    PACKAGE_INSTALL = "package-install",
    PACKAGE_ROLLBACK = "package-rollback"
}
export interface UpgradeError {
    key?: string;
    message: string | string[];
}
export declare const MAX_ERROR_SIZE = 100;
export declare const FLEET_UPGRADES_CHANNEL_NAME = "fleet-upgrades";
export declare function sendTelemetryEvents(logger: Logger, eventsTelemetry: TelemetryEventsSender | undefined, upgradeEvent: PackageUpdateEvent): void;
export declare function capErrorSize(errors: UpgradeError[], maxSize: number): UpgradeError[];
