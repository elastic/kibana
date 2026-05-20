import type { CoreStart, DocLinksStart, ToastInput } from '@kbn/core/public';
import type { ManagementLinkFn } from '@kbn/reporting-common/types';
import type { JobSummary } from '../types';
export declare const getFailureToast: (errorText: string, job: JobSummary, getManagmenetLink: ManagementLinkFn, docLinks: DocLinksStart, core: CoreStart) => ToastInput;
