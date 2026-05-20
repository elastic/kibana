import type { HttpSetup } from '@kbn/core-http-browser';
import type { DeleteSkillResponse, CreateSkillPayload, UpdateSkillPayload } from '../../../common/http_api/skills';
export declare class SkillsService {
    private readonly http;
    constructor({ http }: {
        http: HttpSetup;
    });
    list(options?: {
        includePlugins?: boolean;
    }): Promise<import("@kbn/agent-builder-common").PublicSkillSummary[]>;
    listByAgent({ agentId }: {
        agentId: string;
    }): Promise<import("@kbn/agent-builder-common").PublicSkillSummary[]>;
    get({ skillId }: {
        skillId: string;
    }): Promise<import("@kbn/agent-builder-common").PublicSkillDefinition>;
    delete({ skillId, force }: {
        skillId: string;
        force?: boolean;
    }): Promise<DeleteSkillResponse>;
    create(skill: CreateSkillPayload): Promise<import("@kbn/agent-builder-common").PublicSkillDefinition>;
    update({ skillId, ...update }: UpdateSkillPayload & {
        skillId: string;
    }): Promise<import("@kbn/agent-builder-common").PublicSkillDefinition>;
}
