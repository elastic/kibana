import type { Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { UsageApiConfigType } from './config';
import { UsageReportingService } from './usage_reporting';
/**
 * Setup contract
 */
export interface UsageApiSetup {
    /**
     * Configuration for the Usage API.
     */
    config: UsageApiConfigType;
    /**
     * Usage reporting service for reporting usage metrics.
     * Only exposed if usage reporting is enabled and available.
     */
    usageReporting?: UsageReportingService;
}
/**
 * Start contract
 */
export interface UsageApiStart {
    /**
     * Usage reporting service for reporting usage metrics.
     * Only exposed if usage reporting is enabled and available.
     */
    usageReporting?: UsageReportingService;
}
export declare class UsageApiPlugin implements Plugin<UsageApiSetup, UsageApiStart> {
    private readonly context;
    private readonly config;
    private readonly logger;
    private usageReporting?;
    constructor(context: PluginInitializerContext);
    setup(): UsageApiSetup;
    start(): UsageApiStart;
}
