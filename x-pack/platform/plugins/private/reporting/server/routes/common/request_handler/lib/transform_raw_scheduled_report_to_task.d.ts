import type { SavedObject } from '@kbn/core/server';
import type { ScheduledReportType } from '../../../../types';
import type { ScheduledReportTaskParamsWithoutSpaceId } from '../../../../lib/tasks';
export declare function transformRawScheduledReportToTaskParams(rawScheduledReport: SavedObject<ScheduledReportType>): ScheduledReportTaskParamsWithoutSpaceId;
