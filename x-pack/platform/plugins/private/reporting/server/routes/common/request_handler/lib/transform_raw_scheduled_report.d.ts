import type { SavedObject } from '@kbn/core/server';
import type { ScheduledReportApiJSON, ScheduledReportType } from '../../../../types';
export declare function transformRawScheduledReportToReport(rawScheduledReport: SavedObject<ScheduledReportType>): ScheduledReportApiJSON;
