import { DynamicStructuredTool } from "@langchain/core/tools";

export type Skill = {
    namespace: string;
    name: string;
    description: string;
    content: string;
    tools: DynamicStructuredTool[];
  }