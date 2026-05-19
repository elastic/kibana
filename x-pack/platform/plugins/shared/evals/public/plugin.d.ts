import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { EvalsPublicSetup, EvalsPublicStart, EvalsSetupDependencies, EvalsStartDependencies } from './types';
export declare class EvalsPublicPlugin implements Plugin<EvalsPublicSetup, EvalsPublicStart, EvalsSetupDependencies, EvalsStartDependencies> {
    setup(coreSetup: CoreSetup<EvalsStartDependencies>, { management }: EvalsSetupDependencies): EvalsPublicSetup;
    start(core: CoreStart, _plugins: EvalsStartDependencies): EvalsPublicStart;
    stop(): void;
}
