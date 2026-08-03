import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { DashboardAttachmentPayload } from '../../../../common/types/domain_zod/attachment/dashboard/v2';
export type DashboardPayload = Omit<DashboardAttachmentPayload, 'owner'>;
export declare const buildDashboardPayload: ({ dashboard, id, title, }: {
    dashboard: DashboardStart | undefined;
    id: string;
    title: string;
}) => Promise<DashboardPayload>;
