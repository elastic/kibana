import type { NotificationsSetup } from '@kbn/core/public';
import type { FunctionComponent } from 'react';
interface Props {
    toasts: NotificationsSetup['toasts'];
    onMigrationDone: () => void;
}
export declare const IlmPolicyMigrationNeededCallOut: FunctionComponent<Props>;
export {};
