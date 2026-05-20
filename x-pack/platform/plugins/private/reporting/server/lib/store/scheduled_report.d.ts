import type { SavedObject } from '@kbn/core/server';
import { Report } from './report';
import type { ScheduledReportType } from '../../types';
interface ConstructorOpts {
    runAt: Date;
    kibanaId: string;
    kibanaName: string;
    queueTimeout: number;
    spaceId: string;
    scheduledReport: SavedObject<ScheduledReportType>;
}
export declare class ScheduledReport extends Report {
    constructor(opts: ConstructorOpts);
}
export {};
