import type { HookRegistration, HooksServiceSetup } from '@kbn/agent-builder-server';
import { HookLifecycle } from '@kbn/agent-builder-server';
type HookRegistrationsBundle = Parameters<HooksServiceSetup['register']>[0];
export declare function buildHookRegistrationId(bundleId: string, lifecycle: HookLifecycle): string;
export interface HookRegistry {
    register(bundle: HookRegistrationsBundle): void;
    getHooksForLifecycle(lifecycle: HookLifecycle): Array<HookRegistration<HookLifecycle>>;
}
export declare function createHookRegistry(): HookRegistry;
export {};
