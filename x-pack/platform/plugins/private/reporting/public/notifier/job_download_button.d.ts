import type { JobId } from '@kbn/reporting-common/types';
import React from 'react';
import type { JobSummary } from '../types';
interface Props {
    getUrl: (jobId: JobId) => string;
    job: JobSummary;
}
export declare const DownloadButton: ({ getUrl, job }: Props) => React.JSX.Element;
export {};
