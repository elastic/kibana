import type { TransportResult, estypes } from '@elastic/elasticsearch';
import type { KibanaRequest } from '@kbn/core/server';
import type { ReportApiJSON, ReportSource } from '@kbn/reporting-common/types';
import type { ReportingCore } from '../../..';
import type { ReportingUser } from '../../../types';
import type { Payload } from './get_document_payload';
export type ReportContent = Pick<ReportSource, 'status' | 'jobtype' | 'output'> & {
    payload?: Pick<ReportSource['payload'], 'title'>;
};
export interface JobsQueryFactory {
    list(req: KibanaRequest, user: ReportingUser, page: number, size: number, jobIds: string[] | null): Promise<ReportApiJSON[]>;
    count(user: ReportingUser): Promise<number>;
    get(user: ReportingUser, id: string): Promise<ReportApiJSON | void>;
    getError(id: string): Promise<string>;
    getDocumentPayload(doc: ReportApiJSON): Promise<Payload>;
    delete(deleteIndex: string, id: string): Promise<TransportResult<estypes.DeleteResponse>>;
}
export declare function jobsQueryFactory(reportingCore: ReportingCore, { isInternal }: {
    isInternal: boolean;
}): JobsQueryFactory;
