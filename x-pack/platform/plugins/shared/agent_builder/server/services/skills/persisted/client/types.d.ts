import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SkillReferencedContent } from '@kbn/agent-builder-common';
import type { SkillProperties } from './storage';
export type SkillDocument = Pick<GetResponse<SkillProperties>, '_source' | '_id' | 'fields'>;
export interface SkillPersistedDefinition {
    id: string;
    name: string;
    description: string;
    content: string;
    referenced_content?: SkillReferencedContent[];
    tool_ids: string[];
    referenced_content_count: number;
    plugin_id?: string;
    created_at: string;
    updated_at: string;
}
export interface SkillListOptions {
    /** When true, excludes `content` and `referenced_content` */
    summaryOnly?: boolean;
}
