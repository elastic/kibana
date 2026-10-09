import type { SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import type { SavedObjectsGetOptions } from '@kbn/core-saved-objects-api-server';
import { type AlertingV1RawRuleTemplate } from '../../../saved_objects/schemas/raw_rule_template';
export interface GetRuleTemplateSoParams {
    savedObjectsClient: SavedObjectsClientContract;
    id: string;
    savedObjectsGetOptions?: SavedObjectsGetOptions;
}
/**
 * Gets a Fleet / alerting v1 rule template. Throws if the document uses the
 * alerting-v2 attribute shape.
 */
export declare const getRuleTemplateSo: (params: GetRuleTemplateSoParams) => Promise<SavedObject<AlertingV1RawRuleTemplate>>;
