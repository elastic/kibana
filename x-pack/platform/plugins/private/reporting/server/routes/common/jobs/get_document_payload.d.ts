import type { Stream } from 'stream';
import type { ResponseHeaders } from '@kbn/core-http-server';
import type { ReportApiJSON } from '@kbn/reporting-common/types';
import type { ReportingCore } from '../../..';
export interface ErrorFromPayload {
    message: string;
}
export interface Payload {
    statusCode: number;
    content: string | Stream | ErrorFromPayload;
    contentType: string | null;
    headers: ResponseHeaders;
    filename?: string;
}
export type PayloadCompleted = Payload & {
    filename: string;
};
export declare function getDocumentPayloadFactory(reporting: ReportingCore, { isInternal }: {
    isInternal: boolean;
}): (report: ReportApiJSON) => Promise<Payload>;
