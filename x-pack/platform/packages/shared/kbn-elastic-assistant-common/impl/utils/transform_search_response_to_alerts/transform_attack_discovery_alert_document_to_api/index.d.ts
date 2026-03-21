import type { AttackDiscoveryApiAlert } from '../../../schemas';
import type { AttackDiscoveryAlertDocument } from '../../../schedules/types';
export declare const transformAttackDiscoveryAlertDocumentToApi: ({ attackDiscoveryAlertDocument, enableFieldRendering, id, withReplacements, }: {
    attackDiscoveryAlertDocument: AttackDiscoveryAlertDocument;
    enableFieldRendering: boolean;
    id: string;
    withReplacements: boolean;
}) => AttackDiscoveryApiAlert;
