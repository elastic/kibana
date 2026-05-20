import type { FC } from 'react';
import type { AuditMessageBase } from '@kbn/ml-common-types/audit_message';
interface Props {
    message: AuditMessageBase;
    showTooltip?: boolean;
}
export declare const JobIcon: FC<Props>;
export {};
