import type { CoreStart, ToastInput } from '@kbn/core/public';
import type { JobId } from '@kbn/reporting-common/types';
import type { JobSummary } from '../types';
export declare const getWarningToast: (job: JobSummary, getReportLink: () => string, getDownloadLink: (jobId: JobId) => string, core: CoreStart) => ToastInput;
