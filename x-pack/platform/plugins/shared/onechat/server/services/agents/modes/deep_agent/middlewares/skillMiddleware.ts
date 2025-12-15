import { FileData } from "@kbn/langchain-deep-agent";
import { AgentEventEmitter } from "@kbn/onechat-server/agents";
import { AIMessage, createMiddleware, DynamicStructuredTool, tool, ToolMessage } from "langchain";
import { formatSkillsDirectoryTree } from "../utils/skills_directory_tree";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';

/**
 * The purpose of this middleware is to insert the skill frontmatter into the system prompt.
 * 
 * This is what enables the progressive disclosure of skills to the agent as the agent can
 * decide to read the full skill from the file system when required.
 */
export const createSkillSystemPromptMiddleware = (
    events: AgentEventEmitter,
    skills: Record<string, FileData>,
) => {
    return createMiddleware({
        name: 'skillSystemPromptMiddleware',
        wrapModelCall: (request, handler) => {
            const formattedSkills = formatSkillsDirectoryTree(skills);
            const skillSystemPrompt = `## Agent Skills
In order to help achieve the highest-quality results possible, Elastic has compiled a set of "skills" which are essentially folders that contain a set of best practices for answering user questions. For instance, there is a skill that provides guidance on how to triage alerts. These skill folders have been heavily labored over and contain the condensed wisdom of a lot of trial and error working with LLMs to make really good, professional, outputs. Sometimes multiple skills may be required to get the best results, so one is not limited to just reading one.
            
Skills are stored in the filesystem. Here is an overview of the skills directory:
\n${formattedSkills}`;

            return handler({
                ...request,
                systemPrompt: (request.systemPrompt ? `${request.systemPrompt}\n\n` : "") + skillSystemPrompt,
            })
        }
    });
};


export const createSkillToolExecutor = (tools: DynamicStructuredTool[], events: AgentEventEmitter) => {
    const toolNode = new ToolNode(tools)

    const skillExecutorTool = tool(async ({
        name,
        parameters,
    }, config)=>{

        // Create a message with the tool call that can be used to invoke the toolNode.
        const messageWithToolCalls = new AIMessage({
            tool_calls: [
                {
                    id: uuidv4(), // doesnt really matter what this is. The skillExecutorTool return will use the tool_call_id from the config.
                    name: name,
                    args: parameters,
                }
            ]
        })

        const result = await toolNode.invoke([messageWithToolCalls]) as ToolMessage[];

        const toolMessage = result.at(0)

        if (!toolMessage) {
            return "Tool called"
        }

        return new ToolMessage({
            content: toolMessage.content,
            artifact: toolMessage.artifact,
            contentBlocks: toolMessage.contentBlocks,
            status: toolMessage.status,
            tool_call_id: config.toolCall.id,
        })
    }, {
        name: 'invoke_skill',
        description: 'Invoke a skill by its ID with the provided parameters.',
        schema: z.object({
            name: z.string().describe('The name of the skill to invoke.'),
            parameters: z.object({}).passthrough().describe('The parameters to pass to the skill.'),
        })
    })

    return skillExecutorTool
}