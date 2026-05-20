import type { BehaviorSubject } from 'rxjs';
import type { AppUpdater } from '@kbn/core/public';
import type { MlCapabilities } from '@kbn/ml-common-types/capabilities';
export declare function registerSearchLinks(appUpdater: BehaviorSubject<AppUpdater>, isFullLicense: boolean, mlCapabilities: MlCapabilities, isServerless: boolean, isEsqlEnabled?: boolean): void;
