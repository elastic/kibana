import type { InstallContext } from '../_state_machine_package_install';
export declare function stepResolveDependencies(context: InstallContext): Promise<void>;
export declare function _runWithLock(stepFn: () => Promise<void>): Promise<void>;
