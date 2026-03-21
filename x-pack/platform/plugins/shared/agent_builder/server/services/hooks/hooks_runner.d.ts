import type { Logger } from '@kbn/logging';
import type { HookRegistration, HooksServiceStart } from '@kbn/agent-builder-server';
import { HookLifecycle } from '@kbn/agent-builder-server';
export interface CreateHooksRunnerDeps {
    logger: Logger;
    /** Returns all hook registrations for a given lifecycle (no filtering by mode). */
    getHooksForLifecycle: (lifecycle: HookLifecycle) => Array<HookRegistration<HookLifecycle>>;
}
/**
 * Factory that creates the hooks runner (run function).
 * It runs blocking hooks first, then non-blocking hooks.
 */
export declare function createHooksRunner(deps: CreateHooksRunnerDeps): HooksServiceStart;
