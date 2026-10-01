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
        /Never name tools, parameters, skills, subagents or attachments, and never quote the ids and flags a tool returns/
      );
      expect(instructions).toMatch(/Do not narrate your reasoning or announce each step/);
    });

    it('keeps the facts the user needs to decide', () => {
      expect(instructions).toMatch(
        /how many one run writes, how long a run takes and what it costs/
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
        /when you are working from a brief handed to you as a subagent, the brief is your authority/
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

    it('settles the first automation and asks for intent where it cannot be inferred', () => {
      expect(instructions).toMatch(/An index with no automations starts at Index\/Table Metadata/);
      expect(instructions).toMatch(/where the answer is new coverage, ask which strategy/);
      expect(instructions).toContain(`\`${internalTools.askUserQuestion}\``);
      expect(instructions).toMatch(/name the unit and what one KI should carry/);
      expect(instructions).toMatch(/not forced into the nearest one/);
      expect(instructions).toMatch(
        /may want new coverage, may want something that is not working fixed/
      );
    });

    it('asks before the build and not before the save or the run', () => {
      expect(instructions).toMatch(/Ask before you build; do not ask before you save or run/);
      expect(instructions).toMatch(/The question you owed was the one before the build/);
    });

    it('installs template strategies directly, without a subagent or YAML', () => {
      expect(instructions).toContain(`\`${CONTEXT_ENGINE_INSTALL_AUTOMATION_TEMPLATE_TOOL_ID}\``);
      expect(instructions).toMatch(/do not pass an id, and do not draft YAML for them/);
      expect(instructions).toMatch(
        /attaches the automation without a dialog and does not start a run/
      );
      expect(instructions).toMatch(/the result has `replaced: true` when that happened/);
    });

    it('gates every subagent handoff on a confirmed plan in the proposal shape, grounded in queries', () => {
      expect(instructions).toMatch(/Always ask again before handing anything to a subagent/);
      expect(instructions).toMatch(/naming the automation being replaced/);
      expect(instructions).toMatch(
        /with its Evidence and Cost sections filled from queries you ran/
      );
      expect(instructions).toMatch(/Propose values rather than asking for them/);
      expect(instructions).toMatch(/Lay the plan out in chat before it/);
      expect(instructions).toMatch(/rather than from the mapping/);
    });

    it('saves the piloted yaml rather than a regenerated definition', () => {
      expect(instructions).toContain(
        `\`${CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID}\` with the YAML the subagent returned as \`workflowYaml\``
      );
      expect(instructions).toMatch(/Never re-generate the definition the subagent returned/);
    });

    it('leaves saving and running to their own dialogs, one tool each', () => {
      expect(instructions).toMatch(/Saving and running\*\* are two separate decisions/);
      expect(instructions).toContain(`\`${CONTEXT_ENGINE_RUN_AUTOMATION_TOOL_ID}\``);
      expect(instructions).toMatch(/Never end a turn asking for permission to save or to run/);
      expect(instructions).toMatch(
        /do not follow an install or a save with an `ask_user_question` offering to run/
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
        /load `ai-index-automations` before you install, draft, save or run an automation/
      );
    });

    it('lists Targeted KIs with the templates rather than the subagent path', () => {
      expect(instructions).toMatch(
        /Cumulative entity-profile and Targeted KI automations do not go through a subagent/
      );
    });

    it('never starts a full run without the run dialog, but still lets a draft be piloted', () => {
      expect(instructions).toMatch(
        /Never start the full run of an attached automation with `platform\.core\.execute_workflow`/
      );
      expect(instructions).toMatch(/Piloting an unsaved draft on a handful of documents/);
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
