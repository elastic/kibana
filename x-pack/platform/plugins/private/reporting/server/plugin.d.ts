import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { type ReportingConfigType } from '@kbn/reporting-server';
import type { ReportingSetup, ReportingSetupDeps, ReportingStart, ReportingStartDeps } from './types';
export declare class ReportingPlugin implements Plugin<ReportingSetup, ReportingStart, ReportingSetupDeps, ReportingStartDeps> {
    private initContext;
    private readonly telemetryLogger;
    private logger;
    private reportingCore?;
    constructor(initContext: PluginInitializerContext<ReportingConfigType>);
    setup(core: CoreSetup<ReportingStartDeps, unknown>, plugins: ReportingSetupDeps): ReportingSetup;
    start(core: CoreStart, plugins: ReportingStartDeps): ReportingSetup;
    stop(): void;
}
