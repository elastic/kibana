/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { platformCoreTools, ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { cleanPrompt } from '@kbn/onechat-genai-utils/prompts';
import { ExecutionStatus as WorkflowExecutionStatus } from '@kbn/workflows/types/v1';
import { WAIT_FOR_COMPLETION_TIMEOUT_SEC } from '@kbn/onechat-common/tools/types/workflow';
import { getExecutionState } from '@kbn/onechat-genai-utils/tools/utils/workflows';
import { errorResult, otherResult } from '@kbn/onechat-genai-utils/tools/utils/results';

const schema = z.object({
    workflowId: z.string().describe('Workflow id to execute'),
    inputs: z.record(z.unknown()).optional().default({}).describe('Workflow inputs (JSON object)'),
    waitForCompletion: z.boolean().optional().default(false),
    confirmReason: z
        .string()
        .optional()
        .describe('Optional short reason why it is safe to run (helps auditing and user communication).'),
    confirm: z
        .literal(true)
        .describe('Required safety switch. Set to true only if the user explicitly asked to run this workflow.'),
});

export const runWorkflowTool = ({
    workflowsManagement,
}: {
    workflowsManagement: WorkflowsServerPluginSetup;
}): BuiltinToolDefinition<typeof schema> => {
    const { management: workflowApi } = workflowsManagement;
    const finalStatuses = [WorkflowExecutionStatus.COMPLETED, WorkflowExecutionStatus.FAILED];

    return {
        id: platformCoreTools.runWorkflow,
        type: ToolType.builtin,
        description: cleanPrompt(`Execute a workflow (manual trigger).

Safety:
- This tool may have side effects depending on workflow steps/connectors.
- Only call this tool when the user explicitly asks to run a workflow.
- \`confirm\` MUST be true.

After execution:
- If the workflow doesn’t complete quickly, it returns an execution id.
- Use ${platformCoreTools.getWorkflowExecutionStatus} later to check status/output.
`),
        schema,
        handler: async ({ workflowId, inputs, waitForCompletion }, { request, spaceId }) => {
            const workflow = await workflowApi.getWorkflow(workflowId, spaceId);
            if (!workflow) return { results: [errorResult(`Workflow '${workflowId}' not found.`)] };
            if (!workflow.enabled) {
                return { results: [errorResult(`Workflow '${workflowId}' is disabled and cannot be executed.`)] };
            }
            if (!workflow.valid) {
                return { results: [errorResult(`Workflow '${workflowId}' has validation errors and cannot be executed.`)] };
            }
            if (!workflow.definition) {
                return { results: [errorResult(`Workflow '${workflowId}' has no definition and cannot be executed.`)] };
            }

            const executionId = await workflowApi.runWorkflow(
                {
                    id: workflow.id,
                    name: workflow.name,
                    enabled: workflow.enabled,
                    definition: workflow.definition,
                    yaml: workflow.yaml,
                },
                spaceId,
                inputs ?? {},
                request
            );

            if (!waitForCompletion) {
                return { results: [otherResult({ operation: 'run', executionId, workflowId })] };
            }

            const waitLimit = Date.now() + WAIT_FOR_COMPLETION_TIMEOUT_SEC * 1000;
            let execution = null as Awaited<ReturnType<typeof getExecutionState>> | null;

            await new Promise((r) => setTimeout(r, 1_000));
            do {
                try {
                    execution = await getExecutionState({ executionId, spaceId, workflowApi });
                    if (execution && finalStatuses.includes(execution.status)) {
                        return { results: [otherResult({ execution })] };
                    }
                } catch {
                    // keep polling until timeout
                }
                await new Promise((r) => setTimeout(r, 2_500));
            } while (Date.now() < waitLimit);

            if (execution) return { results: [otherResult({ execution })] };

            return {
                results: [
                    errorResult(
                        `Workflow '${workflowId}' executed but execution not found after ${WAIT_FOR_COMPLETION_TIMEOUT_SEC}s.`
                    ),
                ],
            };
        },
        tags: [],
    };
};


