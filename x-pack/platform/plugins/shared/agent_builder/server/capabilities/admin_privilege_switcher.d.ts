import type { CapabilitiesSwitcher, CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
/**
 * Creates a capability switcher that sets `agentBuilder.isAdmin` based on
 * an unregistered ES application privilege (only wildcard roles get true).
 *
 * When does this switcher run?
 * - Only when capabilities are explicitly resolved for a request.
 * - The main trigger is POST /api/core/capabilities (called once by the browser at app load).
 * - Other triggers: route handlers or services that call
 *   coreStart.capabilities.resolveCapabilities(request, ...). When they request a narrow
 *   path (e.g. uptime.*), only switchers for that path run;
 */
export declare const createAdminPrivilegeSwitcher: (getStartServices: CoreSetup["getStartServices"], logger: Logger) => CapabilitiesSwitcher;
