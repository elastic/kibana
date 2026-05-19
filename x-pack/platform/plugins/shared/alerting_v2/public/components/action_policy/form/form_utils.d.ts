import type { CreateActionPolicyData, ActionPolicyResponse, UpdateActionPolicyBody } from '@kbn/alerting-v2-schemas';
import { needsInterval } from '@kbn/alerting-v2-schemas';
import type { ActionPolicyFormState } from './types';
export { needsInterval };
export declare const toFormState: (response: ActionPolicyResponse) => ActionPolicyFormState;
export declare const toCreatePayload: (state: ActionPolicyFormState) => CreateActionPolicyData;
export declare const toUpdatePayload: (state: ActionPolicyFormState, version: string) => UpdateActionPolicyBody;
