import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { LogsLocatorParams } from './logs_locator';
export interface LogsSharedLocators {
    logsLocator: LocatorPublic<LogsLocatorParams>;
}
