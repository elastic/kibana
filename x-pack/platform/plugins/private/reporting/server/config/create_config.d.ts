import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ReportingConfigType } from '@kbn/reporting-server';
export declare function createConfig(core: CoreSetup, config: ReportingConfigType, parentLogger: Logger): ReportingConfigType;
