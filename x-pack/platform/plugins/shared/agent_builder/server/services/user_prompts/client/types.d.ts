import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { UserPromptProperties } from './storage';
import type { UserPrompt } from '../../../../common/http_api/user_prompts';
export type UserPromptDocument = Pick<GetResponse<UserPromptProperties>, '_source' | '_id'>;
export interface FindUserPromptsParams {
    query?: string;
    page?: number;
    perPage?: number;
}
export interface FindUserPromptsResult {
    page: number;
    perPage: number;
    total: number;
    data: UserPrompt[];
}
