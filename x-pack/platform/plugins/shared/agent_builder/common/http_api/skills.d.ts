import type { PublicSkillDefinition, PublicSkillSummary, PersistedSkillCreateRequest, PersistedSkillUpdateRequest, SerializedAgentBuilderError } from '@kbn/agent-builder-common';
import type { AgentRef } from './tools';
export type { AgentRef };
export declare const SKILL_USED_BY_AGENTS_ERROR_CODE = "SKILL_USED_BY_AGENTS";
interface BulkDeleteSkillResultBase {
    skillId: string;
}
interface BulkDeleteSkillSuccessResult extends BulkDeleteSkillResultBase {
    success: true;
}
interface BulkDeleteSkillFailureResult extends BulkDeleteSkillResultBase {
    success: false;
    reason: SerializedAgentBuilderError;
}
export type BulkDeleteSkillResult = BulkDeleteSkillSuccessResult | BulkDeleteSkillFailureResult;
export interface BulkDeleteSkillResponse {
    results: BulkDeleteSkillResult[];
}
export interface ListSkillsResponse {
    results: PublicSkillSummary[];
}
export type GetSkillResponse = PublicSkillDefinition;
export interface DeleteSkillResponse {
    success: boolean;
}
export type CreateSkillPayload = PersistedSkillCreateRequest;
export type UpdateSkillPayload = PersistedSkillUpdateRequest;
export type CreateSkillResponse = PublicSkillDefinition;
export type UpdateSkillResponse = PublicSkillDefinition;
