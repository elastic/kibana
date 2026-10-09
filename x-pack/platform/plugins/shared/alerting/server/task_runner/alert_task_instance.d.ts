import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { SanitizedRule, RuleTypeParams } from '../../common';
import type { RuleTaskInstance } from './types';
/**
 * Validates persisted rule task params and brands `spaceId` once at this trusted
 * deserialization boundary so the branded {@link SpaceId} flows downstream.
 *
 * Decode is used only for validation — the returned `params` keep the full
 * persisted bag (`consumer`, `adHocRunParamsId`, etc.), not just the schema fields.
 */
export declare function taskInstanceToAlertTaskInstance<Params extends RuleTypeParams>(taskInstance: ConcreteTaskInstance, alert?: SanitizedRule<Params>): RuleTaskInstance;
