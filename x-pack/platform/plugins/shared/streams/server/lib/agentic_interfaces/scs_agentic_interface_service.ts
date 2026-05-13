/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';

import DISCOVER_DIRECTORIES_YAML from './scs/workflows/discover_directories.yaml';
import MAP_SYMBOLS_YAML from './scs/workflows/map_symbols.yaml';
import READ_FILE_FROM_CHUNKS_YAML from './scs/workflows/read_file_from_chunks.yaml';
import SEMANTIC_SEARCH_YAML from './scs/workflows/semantic_search.yaml';
import SYMBOL_ANALYSIS_YAML from './scs/workflows/symbol_analysis.yaml';

const SKILL_CONTENT = readFileSync(join(__dirname, 'scs/skill_content.md'), 'utf8');
const AGENT_INSTRUCTIONS = readFileSync(join(__dirname, 'scs/agent_instructions.md'), 'utf8');

// ─── Precomputed deterministic Kibana workflow IDs ────────────────────────────
// Derived via UUID v5 using the Kibana Agent Builder SDK namespace
// (DNS namespace -> 'kibana-agent-builder-sdk' -> tool sdkId).
// Matches the IDs the SCS CLI installs so this service and the CLI are in sync.

interface WorkflowAsset {
  sdkId: string;
  kibanaId: string;
  yaml: string;
  description: string;
  tags: string[];
}

const WORKFLOW_ASSETS: WorkflowAsset[] = [
  {
    sdkId: 'scs.discover_directories',
    kibanaId: 'workflow-64b5106e-73fa-59b2-a560-d2bf09a09970',
    yaml: DISCOVER_DIRECTORIES_YAML,
    description:
      'Discovers significant directories in a codebase to identify where important packages, modules, or components are located. Use as the first step when exploring an unfamiliar codebase.',
    tags: ['code-search', 'discovery', 'navigation', 'scs', 'architecture'],
  },
  {
    sdkId: 'scs.map_symbols',
    kibanaId: 'workflow-fe2900ac-3f88-58ba-8e3d-ff05bb0b369b',
    yaml: MAP_SYMBOLS_YAML,
    description:
      'Creates a structured map of code symbols organized by file and type. Explore code organization, understand architecture, and find related code by specifying a directory path.',
    tags: ['code-search', 'symbols', 'mapping', 'scs', 'architecture'],
  },
  {
    sdkId: 'scs.read_file_from_chunks',
    kibanaId: 'workflow-a54775cf-93ef-5533-80ee-ba0d1634e0fc',
    yaml: READ_FILE_FROM_CHUNKS_YAML,
    description:
      'Reconstructs file content from indexed code chunks, providing a view of the original file structure.',
    tags: ['code-search', 'file-reading', 'reconstruction', 'scs'],
  },
  {
    sdkId: 'scs.semantic_search',
    kibanaId: 'workflow-38aec933-751e-5da9-b915-c6353529cc96',
    yaml: SEMANTIC_SEARCH_YAML,
    description:
      'Performs semantic search on indexed code with optional KQL filtering. Uses Elasticsearch Query DSL with the split-index model for accurate results.',
    tags: ['code-search', 'semantic', 'elasticsearch', 'scs', 'query-dsl'],
  },
  {
    sdkId: 'scs.symbol_analysis',
    kibanaId: 'workflow-0ccbb4a8-608d-5185-af15-e9b134029bfe',
    yaml: SYMBOL_ANALYSIS_YAML,
    description:
      'Deep-dive analysis of specific symbols across the codebase. Finds all definitions, imports, call sites, test references, and documentation.',
    tags: ['code-search', 'analysis', 'symbols', 'scs', 'impact-analysis'],
  },
];

const SKILL_ID = 'scs-semantic-code-search';
const SKILL_NAME = 'Semantic Code Search';
const SKILL_DESCRIPTION =
  'Research how code works using Semantic Code Search (SCS). Finds symbols, traces data flows, and presents concise findings with file paths and line numbers.';
const SKILL_TOOL_IDS = WORKFLOW_ASSETS.map((w) => w.sdkId);

const AGENT_ID = 'scs.code_researcher';
const AGENT_NAME = 'Code Researcher';
const AGENT_DESCRIPTION =
  'AI-powered assistant for deep code research and analysis. Uses semantic search, symbol analysis, code mapping, and file reading to understand code structure, discover implementations, analyze impact, and view complete file contents.';
const AGENT_LABELS = ['research', 'analysis', 'discovery', 'code-search', 'scs-suite'];

// ─── Service interface ────────────────────────────────────────────────────────

export interface ScsAgenticInterfaceService {
  ensureAgenticInterfaces(params: { enabled: boolean; request: KibanaRequest }): Promise<void>;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export const createScsAgenticInterfaceService = (
  logger: Logger,
  managementApi: WorkflowsServerPluginSetup['management'],
  getAgentBuilder: () => Promise<AgentBuilderPluginStart | undefined>
): ScsAgenticInterfaceService => {
  const log = logger.get('scs-agentic-interface');

  const cancelRunningWorkflowExecutions = async () => {
    for (const wf of WORKFLOW_ASSETS) {
      let results: Array<{ id: string }> = [];
      try {
        const executions = await managementApi.getWorkflowExecutions(
          { workflowId: wf.kibanaId, statuses: [...NonTerminalExecutionStatuses] },
          DEFAULT_SPACE_ID
        );
        results = executions.results;
      } catch {
        continue;
      }
      if (results.length > 0) {
        await Promise.all(
          results.map((r) =>
            managementApi.cancelWorkflowExecution(r.id, DEFAULT_SPACE_ID).catch(() => {})
          )
        );
        log.debug(`Cancelled ${results.length} execution(s) for ${wf.sdkId}`);
      }
    }
  };

  const installWorkflows = async (request: KibanaRequest) => {
    log.info(`Installing ${WORKFLOW_ASSETS.length} SCS workflows...`);
    for (const wf of WORKFLOW_ASSETS) {
      const existing = await managementApi.getWorkflow(wf.kibanaId, DEFAULT_SPACE_ID);
      if (existing) {
        await managementApi.updateWorkflow(
          wf.kibanaId,
          { yaml: wf.yaml },
          DEFAULT_SPACE_ID,
          request
        );
        log.info(`  Updated workflow: ${wf.sdkId}`);
      } else {
        await managementApi.createWorkflow(
          { yaml: wf.yaml, id: wf.kibanaId },
          DEFAULT_SPACE_ID,
          request
        );
        log.info(`  Created workflow: ${wf.sdkId}`);
      }
    }
  };

  const removeWorkflows = async (request: KibanaRequest) => {
    await cancelRunningWorkflowExecutions();
    const ids = WORKFLOW_ASSETS.map((w) => w.kibanaId);
    const { deleted, failures } = await managementApi.deleteWorkflows(
      ids,
      DEFAULT_SPACE_ID,
      request,
      { force: true }
    );
    if (failures.length > 0) {
      log.warn(
        `Some SCS workflows could not be deleted: ${failures
          .map((f) => `${f.id}: ${f.error}`)
          .join('; ')}`
      );
    }
    log.info(`Deleted ${deleted} SCS workflow(s)`);
  };

  const installTools = async (request: KibanaRequest, agentBuilder: AgentBuilderPluginStart) => {
    log.info(`Installing ${WORKFLOW_ASSETS.length} SCS tools...`);
    const toolRegistry = await agentBuilder.tools.getRegistry({ request });
    for (const wf of WORKFLOW_ASSETS) {
      const exists = await toolRegistry.has(wf.sdkId);
      if (exists) {
        await toolRegistry.update(wf.sdkId, {
          description: wf.description,
          tags: wf.tags,
          configuration: { workflow_id: wf.kibanaId },
        });
        log.info(`  Updated tool: ${wf.sdkId}`);
      } else {
        await toolRegistry.create({
          id: wf.sdkId,
          type: ToolType.workflow,
          description: wf.description,
          tags: wf.tags,
          configuration: { workflow_id: wf.kibanaId },
        });
        log.info(`  Created tool: ${wf.sdkId}`);
      }
    }
  };

  const removeTools = async (request: KibanaRequest, agentBuilder: AgentBuilderPluginStart) => {
    const toolRegistry = await agentBuilder.tools.getRegistry({ request });
    for (const wf of WORKFLOW_ASSETS) {
      const exists = await toolRegistry.has(wf.sdkId);
      if (exists) {
        await toolRegistry.delete(wf.sdkId);
        log.info(`  Deleted tool: ${wf.sdkId}`);
      }
    }
  };

  const installSkill = async (request: KibanaRequest, agentBuilder: AgentBuilderPluginStart) => {
    log.info('Installing SCS skill...');
    const skillRegistry = await agentBuilder.skills.getRegistry({ request });
    const exists = await skillRegistry.has(SKILL_ID);
    if (exists) {
      await skillRegistry.update(SKILL_ID, {
        name: SKILL_NAME,
        description: SKILL_DESCRIPTION,
        content: SKILL_CONTENT,
        tool_ids: SKILL_TOOL_IDS,
      });
      log.info(`  Updated skill: ${SKILL_ID}`);
    } else {
      await skillRegistry.create({
        id: SKILL_ID,
        name: SKILL_NAME,
        description: SKILL_DESCRIPTION,
        content: SKILL_CONTENT,
        tool_ids: SKILL_TOOL_IDS,
      });
      log.info(`  Created skill: ${SKILL_ID}`);
    }
  };

  const removeSkill = async (request: KibanaRequest, agentBuilder: AgentBuilderPluginStart) => {
    const skillRegistry = await agentBuilder.skills.getRegistry({ request });
    const exists = await skillRegistry.has(SKILL_ID);
    if (exists) {
      await skillRegistry.delete(SKILL_ID);
      log.info(`  Deleted skill: ${SKILL_ID}`);
    }
  };

  const installAgent = async (request: KibanaRequest, agentBuilder: AgentBuilderPluginStart) => {
    log.info('Installing SCS agent...');
    const agentRegistry = await agentBuilder.agents.getRegistry({ request });
    const exists = await agentRegistry.has(AGENT_ID);

    const agentConfiguration = {
      instructions: AGENT_INSTRUCTIONS,
      tools: [{ tool_ids: SKILL_TOOL_IDS }],
      skill_ids: [SKILL_ID],
    };

    if (exists) {
      await agentRegistry.update(AGENT_ID, {
        name: AGENT_NAME,
        description: AGENT_DESCRIPTION,
        labels: AGENT_LABELS,
        configuration: agentConfiguration,
      });
      log.info(`  Updated agent: ${AGENT_ID}`);
    } else {
      await agentRegistry.create({
        id: AGENT_ID,
        name: AGENT_NAME,
        description: AGENT_DESCRIPTION,
        labels: AGENT_LABELS,
        configuration: agentConfiguration,
      });
      log.info(`  Created agent: ${AGENT_ID}`);
    }
  };

  const removeAgent = async (request: KibanaRequest, agentBuilder: AgentBuilderPluginStart) => {
    const agentRegistry = await agentBuilder.agents.getRegistry({ request });
    const exists = await agentRegistry.has(AGENT_ID);
    if (exists) {
      await agentRegistry.delete({ id: AGENT_ID });
      log.info(`  Deleted agent: ${AGENT_ID}`);
    }
  };

  return {
    async ensureAgenticInterfaces({ enabled, request }) {
      if (enabled) {
        log.info('Installing SCS agentic interfaces...');
        await installWorkflows(request);

        const agentBuilder = await getAgentBuilder();
        if (agentBuilder) {
          await installTools(request, agentBuilder);
          await installSkill(request, agentBuilder);
          await installAgent(request, agentBuilder);
        } else {
          log.warn('Agent Builder not available — SCS tools, skill, and agent were not installed');
        }
        log.info('SCS agentic interfaces installed.');
      } else {
        log.info('Removing SCS agentic interfaces...');
        const agentBuilder = await getAgentBuilder();
        if (agentBuilder) {
          await removeAgent(request, agentBuilder);
          await removeSkill(request, agentBuilder);
          await removeTools(request, agentBuilder);
        }
        await removeWorkflows(request);
        log.info('SCS agentic interfaces removed.');
      }
    },
  };
};
