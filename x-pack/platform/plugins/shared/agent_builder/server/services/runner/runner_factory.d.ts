import type { RunnerFactoryDeps } from './types';
import type { RunnerFactory } from './types';
export declare class RunnerFactoryImpl implements RunnerFactory {
    private readonly deps;
    constructor(deps: RunnerFactoryDeps);
    getRunner(): import("@kbn/agent-builder-server").Runner;
    private createRunnerDeps;
}
