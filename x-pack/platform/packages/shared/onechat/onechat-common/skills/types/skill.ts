import { ToolDefinition } from "@kbn/onechat-common/tools";

export type Skill = {
    namespace: string;
    name: string;
    description: string;
    content: string;
    tools: ToolDefinition[];
  }