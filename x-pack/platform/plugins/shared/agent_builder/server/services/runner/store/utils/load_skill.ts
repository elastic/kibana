import { ToolProvider } from "@kbn/agent-builder-server";
import { SkillsService, ToolManager, ToolManagerToolType } from "@kbn/agent-builder-server/runner";
import { KibanaRequest } from "@kbn/core/server";
import { pickTools } from "../../../agents/modes/utils/select_tools";
import { SkillFileEntry } from "../volumes/skills/types";
import { Logger } from "@kbn/logging";

export async function loadSkillTools({
    skillsService,
    entry,
    toolProvider,
    request,
    toolManager,
    logger,
  }: {
    skillsService: SkillsService;
    entry: SkillFileEntry;
    toolProvider: ToolProvider;
    request: KibanaRequest<unknown, unknown, unknown, any>;
    toolManager: ToolManager;
    logger: Logger;
  }) {
    const skill = skillsService.getSkillDefinition(entry.metadata.skill_id);
    if (skill) {
      const inlineTools = (await skill.getInlineTools?.()) ?? [];
      const inlineExecutableTools = inlineTools.map((tool) => skillsService.convertSkillTool(tool)
      );
  
      const allowedTools = skill.getAllowedTools?.() ?? [];
      const registryExecutableTools = await pickTools({
        toolProvider,
        selection: [{ tool_ids: allowedTools }],
        request,
      });
  
      await toolManager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: [...inlineExecutableTools, ...registryExecutableTools],
          logger,
        },
        {
          dynamic: true,
        }
      );
    } else {
      logger.debug(`Skill '${entry.metadata.skill_id}' not found in registry.`);
    }
  }