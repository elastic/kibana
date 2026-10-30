/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { assertContextEngineWriteAccess } from '../agent_builder/assert_context_engine_write_access';
import {
  parseWorkflowNameFromYaml,
  saveWorkflowToAiIndex,
  type SaveAutomationResult,
} from '../agent_builder/tools/save_automation/handler';
import {
  AUTOMATION_TEMPLATE_TAGS,
  renderDocumentOrchestrationTemplate,
  renderIndexMetadataTemplate,
  renderTargetedKiWriterTemplate,
  renderUnitProfileTemplate,
  type AutomationTemplateId,
  type DocumentOrchestrationTemplateValues,
  type IndexMetadataTemplateValues,
  type TargetedKiWriterTemplateValues,
  type UnitProfileTemplateValues,
} from '../agent_builder/tools/install_automation_template/render';
import { InvalidTemplateParamsError } from '../errors';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

interface WithName {
  /** Human-readable name scoped to the AI index. Used for name-based lookup and injected as the workflow name. */
  name: string;
}

export type InstallAutomationTemplateParams =
  | ({ template: 'document_orchestration' } & Omit<
      DocumentOrchestrationTemplateValues,
      'aiIndexId' | 'automationName'
    > &
      WithName)
  | ({ template: 'index_metadata' } & Omit<
      IndexMetadataTemplateValues,
      'aiIndexId' | 'automationName'
    > &
      WithName)
  | ({ template: 'unit_profile' } & Omit<
      UnitProfileTemplateValues,
      'aiIndexId' | 'automationName'
    > &
      WithName)
  | ({ template: 'targeted_ki_writer' } & Omit<TargetedKiWriterTemplateValues, 'aiIndexId'> &
      WithName);

export interface InstallAutomationTemplateResult extends SaveAutomationResult {
  /** True when an automation already attached to the AI index was overwritten. */
  replaced: boolean;
}

export interface InstallAutomationTemplateDependencies {
  logger: Logger;
  getAiIndexService: () => Promise<AiIndexService>;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
  getWorkflowsManagement: () => WorkflowsManagementApi;
}

const renderTemplate = (params: InstallAutomationTemplateParams, aiIndexId: string): string => {
  if (params.template === 'document_orchestration') {
    return renderDocumentOrchestrationTemplate({
      ...params,
      aiIndexId,
      automationName: params.name,
    });
  }
  if (params.template === 'unit_profile') {
    return renderUnitProfileTemplate({ ...params, aiIndexId, automationName: params.name });
  }
  if (params.template === 'targeted_ki_writer') {
    return renderTargetedKiWriterTemplate({ aiIndexId, kis: params.kis });
  }
  return renderIndexMetadataTemplate({ ...params, aiIndexId, automationName: params.name });
};

/**
 * The workflow YAML an install saves: the template rendered for the AI index, named after the
 * automation. Throws {@link InvalidTemplateParamsError} when the parameters cannot be rendered.
 */
export const renderAutomationTemplate = (
  params: InstallAutomationTemplateParams,
  aiIndexId: string
): string => {
  let yaml: string;
  try {
    yaml = renderTemplate(params, aiIndexId);
  } catch (error) {
    throw new InvalidTemplateParamsError(error instanceof Error ? error.message : String(error));
  }
  // The server derives the workflow id from the name, so ids stay scoped to names rather than to
  // AI index ids. Changing the name of an existing automation changes its ki_ids, which are
  // prefixed with automation_name; KIs written under the old name are not cleaned up.
  return yaml.replace(/^name: .*/m, `name: ${JSON.stringify(params.name)}`);
};

/**
 * The automation on the AI index with exactly the requested name, if one exists. A workflow tagged
 * as a different template is never matched, so one template cannot overwrite another.
 */
export const findInstalledTemplateWorkflowId = async ({
  aiIndexId,
  spaceId,
  request,
  template,
  workflowYaml,
  logger,
  getAiIndexService,
  getWorkflowsManagement,
}: {
  aiIndexId: string;
  spaceId: string;
  request: KibanaRequest;
  template: AutomationTemplateId;
  workflowYaml: string;
  logger: Logger;
  getAiIndexService: () => Promise<AiIndexService>;
  getWorkflowsManagement: () => WorkflowsManagementApi;
}): Promise<string | undefined> => {
  const aiIndex = await (await getAiIndexService()).get(aiIndexId, spaceId);
  const workflowsManagement = getWorkflowsManagement();
  const templateTag = AUTOMATION_TEMPLATE_TAGS[template];
  const templateName = parseWorkflowNameFromYaml(workflowYaml);

  for (const automation of aiIndex.automations) {
    if (automation.type !== 'workflow') {
      continue;
    }

    let workflow: { id?: string; name?: string; tags?: string[] } | null | undefined;
    try {
      workflow = await workflowsManagement.getWorkflow(automation.value, spaceId, request);
    } catch (error) {
      // A failed read is not "not installed". Creating here would attach a second copy.
      logger.error(
        `Failed to read workflow "${automation.value}" while installing ${template}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }

    if (!workflow) {
      continue;
    }

    // Matching is by exact name only. A workflow carrying a different template's tag is skipped
    // to prevent cross-template overwrites. Return immediately on match so later unrelated
    // workflow reads cannot block an already-found replacement target.
    if (workflow.name === templateName) {
      const hasOtherTemplateTag = Object.values(AUTOMATION_TEMPLATE_TAGS).some(
        (tag) => tag !== templateTag && workflow.tags?.includes(tag)
      );
      if (!hasOtherTemplateTag) {
        return workflow.id ?? automation.value;
      }
    }
  }

  return undefined;
};

/**
 * Installs an automation template on an AI index as the caller: renders it, then creates the
 * workflow, or overwrites the one with the same template and name, and attaches it to the index.
 * Shared by the agent tool and the install route.
 */
export const installAutomationTemplate = async ({
  aiIndexId,
  params,
  request,
  spaceId,
  logger,
  getAiIndexService,
  getCoreStart,
  getSecurityStart,
  getWorkflowsManagement,
}: InstallAutomationTemplateDependencies & {
  aiIndexId: string;
  params: InstallAutomationTemplateParams;
  request: KibanaRequest;
  spaceId: string;
}): Promise<InstallAutomationTemplateResult> => {
  await assertContextEngineWriteAccess({ request, spaceId, getCoreStart, getSecurityStart });

  const workflowYaml = renderAutomationTemplate(params, aiIndexId);
  const existingWorkflowId = await findInstalledTemplateWorkflowId({
    aiIndexId,
    spaceId,
    request,
    template: params.template,
    workflowYaml,
    logger,
    getAiIndexService,
    getWorkflowsManagement,
  });

  const result = await saveWorkflowToAiIndex({
    aiIndexId,
    workflowYaml,
    existingWorkflowId,
    request,
    spaceId,
    logger,
    getAiIndexService,
    getSecurityStart,
    getWorkflowsManagement,
  });

  return { ...result, replaced: existingWorkflowId !== undefined };
};
