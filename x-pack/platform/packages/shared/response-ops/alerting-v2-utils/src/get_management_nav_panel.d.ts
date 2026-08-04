import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { StandardNodeDefinition } from '@kbn/core-chrome-browser';
/**
 * Returns the management-section navigation entries that solution side-nav
 * trees should append to their "Stack / Project Settings" footer for the
 * Alerting v2 management apps.
 *
 * Returns an empty array when `alerting:v2:enabled` is `false`, so callers
 * can spread the result unconditionally:
 *
 * ```ts
 * children: [
 *   ...existingChildren,
 *   ...getAlertingV2ManagementNavPanel(core),
 * ]
 * ```
 *
 * The full `CoreStart` is intentionally accepted (rather than a narrower
 * `Pick<CoreStart, 'settings'>`) so that future gating concerns
 * (capability-based RBAC via `core.application.capabilities`, license
 * checks, etc.) can be added inside this helper without changing its
 * signature or touching any of the consumer files again.
 */
export declare const getAlertingV2ManagementNavPanel: (core: CoreStart) => StandardNodeDefinition[];
