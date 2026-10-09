import type { MaintenanceWindowAttributes } from '../../data/types/maintenance_window_attributes';
import type { MaintenanceWindow } from '../types';
type Scope = NonNullable<MaintenanceWindow['scope']>;
/**
 * Normalizes every on-disk `scope` shape into the domain model:
 *  - Pre-MV5 documents (no `alertingEnabled` flag): treat v1 as enabled with any existing filter.
 *  - MV5 documents: read the flag; decode `alerting` only when `alertingEnabled` is true.
 *  - Documents written by a node rolled back to MV4 (flag lost): same as pre-MV5.
 *
 * This function must always return an object (never `undefined`) so that `filterMaintenanceWindows`
 * in `get_maintenance_windows.ts` can read `scope.alerting.enabled` on every document, including
 * legacy ones that never had `scope.alertingEnabled` written to disk.
 */
export declare const decodeScope: (rawScope: MaintenanceWindowAttributes['scope']) => Scope;
export {};
