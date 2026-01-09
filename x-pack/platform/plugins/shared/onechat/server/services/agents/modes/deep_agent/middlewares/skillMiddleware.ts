import { FileData } from "@kbn/langchain-deep-agent";
import { AgentEventEmitter } from "@kbn/onechat-server/agents";
import { AIMessage, createMiddleware, DynamicStructuredTool, tool, ToolMessage } from "langchain";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import type { ToolHandlerContext } from "@kbn/onechat-server/tools";
import zodToJsonSchema from 'zod-to-json-schema';

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
            // IMPORTANT: keep this system prompt injection tiny to avoid exceeding model context length.
            // Skill discovery is done dynamically via grep/read_file.
            const skillSystemPrompt = `## Agent Skills (required)
- Skills live under \`/skills\`.
- Before acting, discover relevant skills with \`grep\` over \`/skills\`, then \`read_file\` the best 1–3 matches.
- Prefer \`invoke_skill\` (skill tool name) over calling tools directly.`;

            return handler({
                ...request,
                systemPrompt: (request.systemPrompt ? `${request.systemPrompt}\n\n` : "") + skillSystemPrompt,
            })
        }
    });
};


export const createSkillToolExecutor = (
    tools: DynamicStructuredTool[],
    events: AgentEventEmitter,
    skillToolContext: Omit<ToolHandlerContext, 'resultStore'>
) => {
    const toolNode = new ToolNode(tools)
    const toolByName = new Map(tools.map((t) => [t.name, t]));

    const selectOperationSchema = (jsonSchema: any, operation?: string) => {
        if (!operation) return jsonSchema;
        const candidates: any[] = jsonSchema?.oneOf ?? jsonSchema?.anyOf ?? [];
        if (!Array.isArray(candidates) || candidates.length === 0) return jsonSchema;

        const match = candidates.find((candidate) => {
            const op = candidate?.properties?.operation;
            if (!op) return false;
            if (op.const && op.const === operation) return true;
            if (Array.isArray(op.enum) && op.enum.includes(operation)) return true;
            return false;
        });

        // If we found a specific op branch, return only that branch schema to keep the payload small & actionable.
        return match ?? jsonSchema;
    };

    const toCompactJson = (value: unknown, maxChars = 6000) => {
        try {
            const s = JSON.stringify(value, null, 2);
            if (s.length <= maxChars) return s;
            return s.slice(0, maxChars) + `\n... (truncated, ${s.length - maxChars} chars omitted)`;
        } catch (_e) {
            return String(value);
        }
    };

    const getExpectedSchemaForTool = (toolName: string) => {
        const t = toolByName.get(toolName);
        const schema = (t as any)?.schema;
        if (!schema) return undefined;
        try {
            // Note: many skill tools use pass-through object schemas; this stays compact.
            return zodToJsonSchema(schema, { $refStrategy: 'none' });
        } catch (_e) {
            return undefined;
        }
    };

    const skillExecutorTool = tool(async ({
        name,
        parameters,
    }, config) => {

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

        // If the tool doesn't exist in the currently enabled skills, return a helpful error.
        if (!toolByName.has(name)) {
            const available = Array.from(toolByName.keys()).sort();
            return new ToolMessage({
                content: toCompactJson({
                    error: {
                        message: `Skill tool "${name}" not found in enabled skills.`,
                        tool: name,
                    },
                    available_tools_sample: available.slice(0, 50),
                    available_tools_total: available.length,
                }),
                tool_call_id: config.toolCall.id,
                status: 'error',
            });
        }

        let toolMessage: ToolMessage | undefined;
        try {
            // Pass OneChat context to skill-tools via LangChain's configurable mechanism
            const result = await toolNode.invoke(
                [messageWithToolCalls],
                { configurable: { onechat: skillToolContext } }
            ) as ToolMessage[];

            toolMessage = result.at(0)
        } catch (e: any) {
            const operation = (parameters as any)?.operation;
            const expectedSchemaFull = getExpectedSchemaForTool(name);
            const expectedSchema = expectedSchemaFull
                ? selectOperationSchema(expectedSchemaFull, typeof operation === 'string' ? operation : undefined)
                : undefined;
            const errorMessage = e?.message ?? String(e);
            return new ToolMessage({
                content: toCompactJson({
                    error: {
                        message: errorMessage,
                        tool: name,
                    },
                    ...(typeof operation === 'string' ? { operation } : {}),
                    ...(expectedSchema ? { expected_schema: expectedSchema } : {}),
                    hint: 'Fix the tool call arguments to match expected_schema and retry invoke_skill.',
                }),
                tool_call_id: config.toolCall.id,
                status: 'error',
            });
        }

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
        description:
            'Invoke a skill tool (exposed by enabled skills) by name, with the provided parameters.',
        schema: z.object({
            name: z.string().describe('The skill tool name to invoke (e.g. "platform.core.search").'),
            parameters: z.object({}).passthrough().describe('The parameters to pass to the skill tool.'),
        })
    })

    return skillExecutorTool
}