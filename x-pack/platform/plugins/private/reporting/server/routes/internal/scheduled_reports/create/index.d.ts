import type { Logger } from '@kbn/core/server';
import type { ReportingCore } from '../../../..';
import type { ReportingPluginRouter } from '../../../../types';
export declare const registerInternalCreateScheduledReportRoute: ({ logger, router, reporting, }: {
    logger: Logger;
    router: ReportingPluginRouter;
    reporting: ReportingCore;
}) => void;
