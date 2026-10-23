/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { internalTools } from '@kbn/agent-builder-common';
import {
  AI_INDEX_AUTOMATIONS_SKILL_ID,
  AI_INDEX_SOURCES_SKILL_ID,
  ANALYZE_AND_IMPROVE_SKILL_ID,
  CONTEXT_ENGINE_SIGNALS_SKILL_ID,
  KI_RETRIEVAL_SKILL_ID,
} from '../../common/agent_builder_skills';
import {
  CONTEXT_ENGINE_INSTALL_AUTOMATION_TEMPLATE_TOOL_ID,
  CONTEXT_ENGINE_RUN_AUTOMATION_TOOL_ID,
  CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID,
} from '../../common/agent_builder_tools';
import { registerContextEngineAgent } from './context_engine_agent';

const registeredInstructions = (): string => {
  const register = jest.fn();
  registerContextEngineAgent({ agents: { register } } as unknown as AgentBuilderPluginSetup);
  return register.mock.calls[0][0].configuration.instructions;
};

describe('Context Engine agent instructions', () => {
  const instructions = registeredInstructions();

  describe('how the agent talks', () => {
    it('talks about the user’s data and outcomes, in their terms', () => {
      expect(instructions).toMatch(/Talk to them about that data and about what an automation/);
      expect(instructions).toMatch(/I'll save this workflow and then run it over your documents/);
    });

    it('keeps tool names, parameters and mechanics out of what the user reads', () => {
      expect(instructions).toMatch(
        /Never name tools, parameters, skills or attachments, and never quote the ids and flags a tool returns/
      );
      expect(instructions).toMatch(/Do not narrate your reasoning or announce each step/);
    });

    it('names the catalog strategy to the user, followed by what it produces', () => {
      expect(instructions).toMatch(/name the strategy, then say in plain words what it produces/);
      expect(instructions).toMatch(
        /Index\/Table Metadata, Bottom-Up, Cumulative \/ Wiki-style and the rest — are the user's terms too/
      );
    });

    it('names no document summary workflow, which the document template does not use', () => {
      expect(instructions).not.toMatch(/system-context-engine-document-summary/);
    });

    it('stops after a pilot that failed or wrote fewer indicators than it covered', () => {
      expect(instructions).toMatch(
        /unless it failed or wrote fewer indicators than it covered: then report that and stop/
      );
    });

    it('uses the catalog names for the template strategies, not variants of them', () => {
      expect(instructions).not.toMatch(/Cumulative entity-profile|Bottom-Up document/);
    });

    it('keeps its examples generic, outside any one domain', () => {
      expect(instructions).not.toMatch(/\b(tickets?|zendesk|invoices?|support cases?)\b/i);
    });

    it('keeps the facts the user needs to decide', () => {
      expect(instructions).toMatch(
        /how many one run writes and the model calls that costs, how long a run takes once a pilot has measured it/
      );
    });
  });

  describe('how a setup conversation goes', () => {
    it('applies to conversations with an ai_index attachment, and persists nothing without one', () => {
      expect(instructions).toMatch(
        /These rules apply when the conversation has an `ai_index` attachment/
      );
      expect(instructions).toMatch(
        /Without an attached AI index, do not attempt to persist changes/
      );
      expect(instructions).toMatch(
        /Saving or running the automation itself stays with the conversation that has the attachment/
      );
    });

    it('names the skill for each thing the conversation might do', () => {
      for (const skillId of [
        ANALYZE_AND_IMPROVE_SKILL_ID,
        AI_INDEX_AUTOMATIONS_SKILL_ID,
        AI_INDEX_SOURCES_SKILL_ID,
        KI_RETRIEVAL_SKILL_ID,
        CONTEXT_ENGINE_SIGNALS_SKILL_ID,
      ]) {
        expect(instructions).toContain(`\`${skillId}\``);
      }
    });

    it('scopes evidence by what the user chose: data alone for a fresh index, signals only with traces or automations', () => {
      expect(instructions).toMatch(/nothing built yet is analyzed from its data alone/);
      expect(instructions).toMatch(/do not look for signals or traces/);
      expect(instructions).toMatch(/Read signals only when the user brought traces into scope/);
      expect(instructions).toMatch(/or when the index already has automations/);
    });

    it('chooses the first strategy from the data, proceeding on a clear fit and asking on a tie', () => {
      expect(instructions).not.toMatch(/starts at Index\/Table Metadata/);
      expect(instructions).not.toMatch(/that is settled/);
      expect(instructions).toMatch(
        /choose it by the signals in the strategy catalog rather than from a default/
      );
      expect(instructions).toMatch(
        /When one strategy clearly fits, state it with the evidence that chose it and proceed, without asking which strategy/
      );
      expect(instructions).toMatch(
        /When two fit about equally, or the data does not show what the index is for, ask with `ask_user_question`, offering the recommended strategy first/
      );
      expect(instructions).toMatch(
        /Index\/Table Metadata is not that default: it is the strategy for routing between or joining several sources/
      );
    });

    it('asks for intent where it cannot be inferred', () => {
      expect(instructions).toMatch(/where the answer is new coverage, ask which strategy/);
      expect(instructions).toContain(`\`${internalTools.askUserQuestion}\``);
      expect(instructions).toMatch(
        /may want new coverage, may want something that is not working fixed/
      );
    });

    it('offers only the four template strategies, with no custom-workflow option', () => {
      expect(instructions).toMatch(
        /Offer only the four strategies with a template as options — Index\/Table Metadata, Bottom-Up, Cumulative \/ Wiki-style and Targeted KI — and nothing else/
      );
      expect(instructions).not.toMatch(/something else/);
    });

    it('asks before the build and not before the save or the run', () => {
      expect(instructions).toMatch(
        /Settle what to build before you build, asking only where it is not clear; do not ask before you save or run/
      );
      expect(instructions).not.toMatch(/Ask before you build;/);
      expect(instructions).toMatch(/The question you owed was the one before the build/);
    });

    it('installs template strategies directly, without drafting YAML', () => {
      expect(instructions).toContain(`\`${CONTEXT_ENGINE_INSTALL_AUTOMATION_TEMPLATE_TOOL_ID}\``);
      expect(instructions).toMatch(/do not pass an id, and do not draft YAML for them/);
      expect(instructions).toMatch(
        /attaches the automation without a dialog and does not start a run/
      );
      expect(instructions).toMatch(
        /installing the same template again with the same name replaces that automation in place, and the result has `replaced: true`; a different name adds another automation/
      );
      expect(instructions).not.toMatch(/rather than adding a second one/);
    });

    it('sends anything the templates cannot build to the Workflow editor, not to this conversation', () => {
      expect(instructions).toMatch(/Everything else is out of scope here/);
      expect(instructions).toMatch(
        /Do not draft workflow YAML yourself and do not try to author one through any other tool/
      );
      expect(instructions).toMatch(/tell them to build the workflow in the Workflow editor/);
      expect(instructions).toContain(
        `\`${CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID}\` with its \`workflowId\` to attach it to the AI index`
      );
    });

    it('leaves saving and running to their own dialogs, one tool each', () => {
      expect(instructions).toMatch(/Saving and running\*\* are two separate decisions/);
      expect(instructions).toContain(`\`${CONTEXT_ENGINE_RUN_AUTOMATION_TOOL_ID}\``);
      expect(instructions).toMatch(/Never end a turn asking for permission to save or to run/);
      expect(instructions).toMatch(
        /do not follow an install or a save with an `ask_user_question` offering to run/
      );
    });

    it('pilots a template install that writes more than 5 items through the run tool before its full run', () => {
      expect(instructions).toMatch(
        /a pilot first when a document, unit-profile or index-metadata install writes more than 5 items, then the full run/
      );
      expect(instructions).not.toMatch(/when a template install writes more than 5 items/);
      expect(instructions).not.toMatch(/a pilot of a document or unit-profile install first/);
      expect(instructions).toMatch(
        /A pilot returns when it finishes, with its duration: state the projected full-run time from it, then start the full run/
      );
    });

    it('reports a started run and treats a failed one as something to report, not to retry by hand', () => {
      expect(instructions).toMatch(
        /When `started` is false the run did not happen and `reason` says why/
      );
      expect(instructions).toMatch(/Never answer a failed run by executing the workflow yourself/);
      expect(instructions).toMatch(/a second one starts the automation twice/);
    });

    it('suppresses the workflow preview, which other attachments ask the agent to render', () => {
      expect(instructions).toMatch(/Never render the workflow attachment preview/);
      expect(instructions).toMatch(/render that and nothing else/);
    });

    it('loads the automations skill before installing, saving or running, since it carries the run tool', () => {
      expect(instructions).toMatch(
        /load `ai-index-automations` before you install, save or run an automation/
      );
    });

    it('lists Targeted KIs with the templates, the only automations built in this conversation', () => {
      expect(instructions).toMatch(
        /Cumulative \/ Wiki-style and Targeted KI automations are the only automations built in this conversation/
      );
    });

    it('never starts a full run without the run dialog', () => {
      expect(instructions).toMatch(
        /Never start the full run of an attached automation with `platform\.core\.execute_workflow`/
      );
    });

    it('treats an error or a declined dialog as no run, without retrying', () => {
      expect(instructions).toMatch(
        /An error result, or a dialog the user declined, also means no run/
      );
    });

    it('keeps the user’s own index and field names in the evidence while hiding tool mechanics', () => {
      expect(instructions).toMatch(
        /The user's own index and field names, the counts from queries you ran, and anything else/
      );
      expect(instructions).not.toMatch(/never quote field names from tool results/);
    });

    it('describes the current save and run tools, not the combined save-and-run they replaced', () => {
      expect(instructions).not.toMatch(/run\.started|run\.reason|`run` set to true/);
    });
  });
});
