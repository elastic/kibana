import type { ReportDocumentHead, ReportSource } from '@kbn/reporting-common/types';
import { Report } from '.';
export declare class SavedReport extends Report {
    _index: string;
    _id: string;
    _primary_term: number;
    _seq_no: number;
    constructor(opts: Partial<ReportSource> & Partial<ReportDocumentHead>);
}
