import type { RruleSchedule } from '@kbn/task-manager-plugin/server';
import type { IKibanaResponse } from '@kbn/core/server';
import type { RawNotification } from '../../../saved_objects/scheduled_report/schemas/latest';
import type { ScheduledReportApiJSON } from '../../../types';
import type { RequestParams } from './request_handler';
import { RequestHandler } from './request_handler';
declare const validation: {
    params: import("@kbn/config-schema").ObjectType<{
        exportType: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").ObjectType<{
        schedule: import("@kbn/config-schema").ObjectType<{
            rrule: import("@kbn/config-schema").Type<Readonly<{
                bymonthday?: number[] | undefined;
                byweekday?: string[] | undefined;
                byhour?: number[] | undefined;
                byminute?: number[] | undefined;
                dtstart?: string | undefined;
            } & {
                interval: number;
                freq: import("@kbn/rrule/types").Frequency.MONTHLY;
                tzid: string;
            }> | Readonly<{
                byweekday?: string[] | undefined;
                byhour?: number[] | undefined;
                byminute?: number[] | undefined;
                dtstart?: string | undefined;
            } & {
                interval: number;
                bymonthday: never;
                freq: import("@kbn/rrule/types").Frequency.WEEKLY;
                tzid: string;
            }> | Readonly<{
                byweekday?: string[] | undefined;
                byhour?: number[] | undefined;
                byminute?: number[] | undefined;
                dtstart?: string | undefined;
            } & {
                interval: number;
                bymonthday: never;
                freq: import("@kbn/rrule/types").Frequency.DAILY;
                tzid: string;
            }> | Readonly<{
                byminute?: number[] | undefined;
                dtstart?: string | undefined;
            } & {
                interval: number;
                bymonthday: never;
                byweekday: never;
                byhour: never;
                freq: import("@kbn/rrule/types").Frequency.HOURLY;
                tzid: string;
            }>>;
        }>;
        notification: import("@kbn/config-schema").Type<Readonly<{
            email?: Readonly<{
                to?: string[] | undefined;
                cc?: string[] | undefined;
                bcc?: string[] | undefined;
                message?: string | undefined;
                subject?: string | undefined;
            } & {}> | null | undefined;
        } & {}> | undefined>;
        jobParams: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {}> | null>;
};
/**
 * Handles the common parts of requests to generate a report
 * Serves report job handling in the context of the request to generate the report
 */
export declare class ScheduleRequestHandler extends RequestHandler<(typeof validation)['params'], (typeof validation)['query'], (typeof validation)['body'], ScheduledReportApiJSON> {
    protected checkLicense(exportTypeId: string): Promise<IKibanaResponse | null>;
    static getValidation(): {
        params: import("@kbn/config-schema").ObjectType<{
            exportType: import("@kbn/config-schema").Type<string>;
        }>;
        body: import("@kbn/config-schema").ObjectType<{
            schedule: import("@kbn/config-schema").ObjectType<{
                rrule: import("@kbn/config-schema").Type<Readonly<{
                    bymonthday?: number[] | undefined;
                    byweekday?: string[] | undefined;
                    byhour?: number[] | undefined;
                    byminute?: number[] | undefined;
                    dtstart?: string | undefined;
                } & {
                    interval: number;
                    freq: import("@kbn/rrule/types").Frequency.MONTHLY;
                    tzid: string;
                }> | Readonly<{
                    byweekday?: string[] | undefined;
                    byhour?: number[] | undefined;
                    byminute?: number[] | undefined;
                    dtstart?: string | undefined;
                } & {
                    interval: number;
                    bymonthday: never;
                    freq: import("@kbn/rrule/types").Frequency.WEEKLY;
                    tzid: string;
                }> | Readonly<{
                    byweekday?: string[] | undefined;
                    byhour?: number[] | undefined;
                    byminute?: number[] | undefined;
                    dtstart?: string | undefined;
                } & {
                    interval: number;
                    bymonthday: never;
                    freq: import("@kbn/rrule/types").Frequency.DAILY;
                    tzid: string;
                }> | Readonly<{
                    byminute?: number[] | undefined;
                    dtstart?: string | undefined;
                } & {
                    interval: number;
                    bymonthday: never;
                    byweekday: never;
                    byhour: never;
                    freq: import("@kbn/rrule/types").Frequency.HOURLY;
                    tzid: string;
                }>>;
            }>;
            notification: import("@kbn/config-schema").Type<Readonly<{
                email?: Readonly<{
                    to?: string[] | undefined;
                    cc?: string[] | undefined;
                    bcc?: string[] | undefined;
                    message?: string | undefined;
                    subject?: string | undefined;
                } & {}> | null | undefined;
            } & {}> | undefined>;
            jobParams: import("@kbn/config-schema").Type<string>;
        }>;
        query: import("@kbn/config-schema").Type<Readonly<{} & {}> | null>;
    };
    getSchedule(): RruleSchedule;
    getNotification(): RawNotification | undefined;
    enqueueJob(params: RequestParams): Promise<ScheduledReportApiJSON>;
    handleRequest(params: RequestParams): Promise<IKibanaResponse<any>>;
}
export {};
