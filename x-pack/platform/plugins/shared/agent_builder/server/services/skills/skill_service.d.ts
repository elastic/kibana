import type { ElasticsearchServiceStart, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import type { SkillRegistry } from './skill_registry';
export interface SkillServiceSetup {
    registerSkill(skill: SkillDefinition): void;
}
export interface SkillServiceStart {
    /**
     * Create a skill registry scoped to the current user and context.
     *
     * Each call snapshots the currently registered builtin skills, so
     * dynamic registrations or unregistrations that happen after the
     * registry is created do not affect that registry instance.
     */
    getRegistry(opts: {
        request: KibanaRequest;
    }): Promise<SkillRegistry>;
    /**
     * Register a skill dynamically after plugin start.
     *
     * The operation is serialized internally so concurrent calls are safe.
     * Only affects future `getRegistry()` calls -- existing registry
     * instances hold an immutable snapshot of the builtin skills that
     * existed at creation time.
     */
    registerSkill(skill: SkillDefinition): Promise<void>;
}
export interface SkillService {
    setup: () => SkillServiceSetup;
    start: (deps: SkillServiceStartDeps) => SkillServiceStart;
}
export interface SkillServiceStartDeps {
    elasticsearch: ElasticsearchServiceStart;
    spaces?: SpacesPluginStart;
    logger: Logger;
    getToolRegistry: (opts: {
        request: KibanaRequest;
    }) => Promise<ToolRegistry>;
}
export declare const createSkillService: () => SkillService;
