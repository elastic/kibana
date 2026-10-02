/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import {
  contextEngineAiIndexTools,
  contextEngineAutomationTools,
  platformCoreTools,
} from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import {
  KI_SHAPES_REFERENCE_NAME,
  STRATEGY_CATALOG_REFERENCE_NAME,
} from '../context_engine_shared';
import { contextEngineSkillAvailability } from '../context_engine_skill_availability';
import { aiIndexAutomationsSkill } from './ai_index_automations_skill';

describe('aiIndexAutomationsSkill', () => {
  it('registers with stable id, name, and context-engine base path', () => {
    expect(aiIndexAutomationsSkill.id).toBe('ai-index-automations');
    expect(aiIndexAutomationsSkill.name).toBe('ai-index-automations');
    expect(aiIndexAutomationsSkill.basePath).toBe('skills/platform/context-engine');
  });

  it('is present in the built-in skills allow list', () => {
    expect(isAllowedBuiltinSkill(aiIndexAutomationsSkill.id)).toBe(true);
  });

  it('is gated behind experimental features and Context Engine availability', () => {
    expect(aiIndexAutomationsSkill.experimental).toBe(true);
    expect(aiIndexAutomationsSkill.availability).toBe(contextEngineSkillAvailability);
  });

  it('ships non-empty markdown content', () => {
    expect(typeof aiIndexAutomationsSkill.content).toBe('string');
    expect(aiIndexAutomationsSkill.content.length).toBeGreaterThan(0);
  });

  it('carries only the shared references', () => {
    const names = (aiIndexAutomationsSkill.referencedContent ?? []).map(({ name }) => name);

    expect(names).toEqual([KI_SHAPES_REFERENCE_NAME, STRATEGY_CATALOG_REFERENCE_NAME]);
  });

  it('documents the null-omits-attribute contract for attributes.esql in the step contract', () => {
    expect(aiIndexAutomationsSkill.content).toMatch(/A\s+`null` value omits the attribute/);
    expect(aiIndexAutomationsSkill.content).toMatch(/default: nil/);
    expect(aiIndexAutomationsSkill.content).toMatch(
      /verifiers skip an indicator without it\.\s+Never write an empty list or an empty string there/
    );
  });

  it('documents the escape as LiquidJS reads it, with backslashes escaped first', () => {
    const { content } = aiIndexAutomationsSkill;

    expect(content).not.toContain(`| \`replace: '"', '\\"'\` |`);
    expect(content).toContain(`\`replace: '\\\\', '\\\\\\\\' | replace: '"', '\\\\"'\``);
    expect(content).toMatch(/LiquidJS reads backslash escapes inside a quoted argument/);
  });

  it('mentions every referencedContent entry by name in the skill content', () => {
    for (const reference of aiIndexAutomationsSkill.referencedContent ?? []) {
      expect(aiIndexAutomationsSkill.content).toContain(reference.name);
    }
  });

  it('is the skill that carries the authoring and execution tools', async () => {
    const toolIds = (await aiIndexAutomationsSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).toEqual([
      platformCoreTools.executeWorkflow,
      platformCoreTools.getWorkflowExecutionStatus,
      platformCoreTools.generateEsql,
      platformCoreTools.executeEsql,
      contextEngineAiIndexTools.queryAiIndices,
      `${internalNamespaces.workflows}.validate_workflow`,
      `${internalNamespaces.workflows}.get_workflow`,
      `${internalNamespaces.workflows}.get_step_definitions`,
      `${internalNamespaces.workflows}.get_trigger_definitions`,
      `${internalNamespaces.workflows}.get_examples`,
      `${internalNamespaces.workflows}.workflow_execute_step`,
      contextEngineAutomationTools.installAutomationTemplate,
      contextEngineAutomationTools.saveAutomation,
      contextEngineAutomationTools.runAutomation,
    ]);
  });

  it('names every tool it binds, so none is bound without a use', async () => {
    const toolIds = (await aiIndexAutomationsSkill.getRegistryTools?.()) ?? [];

    expect(toolIds.filter((id) => !aiIndexAutomationsSkill.content.includes(id))).toEqual([]);
  });

  it('binds no tool that writes a KI directly, since KIs come from automations', async () => {
    const toolIds = (await aiIndexAutomationsSkill.getRegistryTools?.()) ?? [];

    expect(toolIds.some((id) => /createKi|updateKi|deleteKi/i.test(id))).toBe(false);
  });

  it('binds no workflow generator, and names it only to forbid it', async () => {
    const toolIds = (await aiIndexAutomationsSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).not.toContain(platformCoreTools.generateWorkflow);

    // Unbinding it does not take it away — it is in `defaultAgentToolIds`, and `run_subagent`
    // gives a subagent the parent's configuration — so every mention has to be a prohibition.
    const mentions = aiIndexAutomationsSkill.content
      .split('\n')
      .filter((line) => line.includes('generate_workflow'));

    expect(mentions.length).toBeGreaterThan(0);
    expect(mentions.every((line) => /must not call|Do not generate/.test(line))).toBe(true);
  });

  it('only instructs the agent to call tools that are actually bound', async () => {
    const boundTools = (await aiIndexAutomationsSkill.getRegistryTools?.()) ?? [];

    const referencedToolIds = [
      ...new Set(
        [
          ...aiIndexAutomationsSkill.content.matchAll(
            /platform\.(?:core|workflows|context_engine)\.[a-z_]+/g
          ),
        ].map(([match]) => match)
      ),
    ];

    expect(referencedToolIds.length).toBeGreaterThan(0);
    // `generate_workflow` is the one tool named without being bound, because the skill's purpose
    // in naming it is to tell the agent not to call the one it already has.
    const shouldBeBound = referencedToolIds.filter(
      (toolId) => toolId !== platformCoreTools.generateWorkflow
    );

    expect(shouldBeBound.filter((toolId) => !boundTools.includes(toolId))).toEqual([]);
  });

  describe('content', () => {
    const { content } = aiIndexAutomationsSkill;

    it('requires reading an automation before making a claim about it', () => {
      expect(content).toContain('Read the automation before you say anything about it');
    });

    it('states the sink contract every automation has to satisfy', () => {
      expect(content).toMatch(/pass\s+`verifiers` to every `context-engine\.createKi`/);
      expect(content).toContain('ki_id');
      expect(content).toContain('attributes.esql');
    });

    it('carries a workflow shape for every strategy the analysis skill can choose', () => {
      for (const strategy of [
        'Index/Table Metadata',
        'Bottom-Up',
        'Selective / Outlier',
        'Atomic Facts',
        'Cumulative / Wiki-style',
        'Detection / Feature',
      ]) {
        expect(content).toContain(strategy);
      }
    });

    it('requires the final untested edit to be validated, since no run covers it', () => {
      expect(content).toMatch(/Validate outright in one place: the last edit/);
      expect(content).toContain(`${internalNamespaces.workflows}.validate_workflow`);
    });

    it('starts authoring from a template rather than from a blank workflow', () => {
      expect(content).toMatch(/Start from the template\. Do not write a workflow/);
      expect(content).toMatch(/all take a raw\s+`yaml` string/);
    });

    it('names each template where its strategy is described, so the brief can cite one', () => {
      // Install-tool strategies: template param appears near each strategy description.
      expect(content).toMatch(/Index\/Table Metadata.*\n?.*template: index_metadata/);
      expect(content).toMatch(/Bottom-Up.*\n?.*template: document_orchestration/);
      expect(content).toMatch(/Cumulative.*\n?.*template: unit_profile/);
      // targeted_ki_writer is now installed via the install_automation_template tool.
      expect(content).toMatch(/template: targeted_ki_writer/);
      expect(content).not.toContain('entity-profile-template');
    });

    it('describes the targeted KI writer as it is: kis passed to the install, verified on createKi', () => {
      const prose = content.replace(/\s+/g, ' ');

      expect(prose).not.toMatch(/edit the `kis` array in the workflow's `consts` block/);
      expect(prose).not.toMatch(/each through `verifyKi` and `createKi`/);
      expect(prose).toMatch(
        /the KIs are written verbatim from the `kis` array passed to the install, each through `createKi` with its verifiers and a stable `ki_id`/
      );
    });

    it('describes the unit profile automation as the three strategy answers and pagination', () => {
      expect(content).toMatch(/how units are found and refreshed/);
      expect(content).toMatch(/a re-run regenerates every unit/);
      expect(content).not.toMatch(/fingerprint|profile_version|freshness_field/);
    });

    it('has the brief carry the three strategy answers and the counted findings', () => {
      expect(content).toMatch(/\*\*as its three answers\*\*/);
      expect(content).toMatch(/\*\*the counted findings\*\*/);
      expect(content).toMatch(/what is not in the brief is not in the KI/i);
    });

    it('retries ai.prompt in a sequential loop only, since a parallel branch cannot hold it', () => {
      const prose = content.replace(/\s+/g, ' ');

      expect(prose).toMatch(/\*\*Retry `ai\.prompt` outside a `parallel` branch\*\*/);
      expect(prose).toMatch(/three attempts, exponential delay and jitter/);
      expect(prose).toMatch(
        /The templates' loops are all `parallel`, so they run their model calls without it/
      );
      expect(prose).not.toMatch(/The templates carry it; keep it on any `ai\.prompt` you add/);
    });

    it('lists everything a parallel branch rejects, with the on-failure example outside it', () => {
      const prose = content.replace(/\s+/g, ' ');

      expect(prose).toMatch(
        /A branch cannot hold a step-level `timeout:` or `on-failure`, an `if`, a nested `foreach`, `while` or `switch`, or a step that waits on a human/
      );
      expect(prose).not.toMatch(/Two things a branch still cannot hold/);
    });

    it('describes the template safeguards as verifiers on createKi, not a verifyKi gate or a retry', () => {
      expect(content).not.toMatch(/the `verifyKi` gate/);
      expect(content).not.toMatch(/the retry on the model call/);
      expect(content.replace(/\s+/g, ' ')).toMatch(/the `verifiers` on `createKi`/);
    });

    it('points at the shared references for the shape and the catalog instead of restating them', () => {
      expect(content).toContain(`\`${KI_SHAPES_REFERENCE_NAME}\``);
      expect(content).toContain(`\`${STRATEGY_CATALOG_REFERENCE_NAME}\``);
      expect(content).not.toMatch(/\| `title` \| text \+ semantic \|/);
    });

    it('does not teach loop.continue, which no template uses', () => {
      expect(content).not.toMatch(/variables\.<(key|name)>/);
      // No template skips an iteration any more, so the skill no longer teaches it.
      expect(content).not.toContain('loop.continue');
    });

    it('never reruns a failed call unchanged', () => {
      expect(content).toMatch(/Never rerun a\s+failed call unchanged/);
    });

    it('points the strategies without an install path at the unit-profile-template shape', () => {
      expect(content).toMatch(
        /Outlier, atomic facts, detection[^\n]*\n[^\n]*start from the shape of `unit-profile-template`/
      );
    });

    it('says what a template already encodes, so it is edited rather than rewritten', () => {
      expect(content).toMatch(/a fresh draft gets\s+wrong/);
      expect(content).toMatch(/Take it literally/);
      expect(content).toMatch(/none of them announce themselves/);
    });

    it('has the brief name the workflow it starts from, since a subagent without one writes from nothing', () => {
      expect(content).toMatch(/\*\*the workflow it starts from, by name\*\*/);
      expect(content).toMatch(/rediscovering what\s+that automation already encodes/);
    });

    it('points at the lookup tools that cover built-in and connector step types', () => {
      expect(content).toContain(`${internalNamespaces.workflows}.get_step_definitions`);
      expect(content).toContain(`${internalNamespaces.workflows}.get_trigger_definitions`);
      expect(content).toContain(`${internalNamespaces.workflows}.get_examples`);
    });

    it('offers single-step execution for isolating a failing step', () => {
      expect(content).toContain(`${internalNamespaces.workflows}.workflow_execute_step`);
      expect(content).toMatch(/runs that step alone out of the inline YAML/);
    });

    it('delegates the build-and-test loop rather than saving an unrun draft', () => {
      expect(content).toContain('delegate the build-and-test loop to a subagent');
      expect(content).toMatch(/A workflow that has never run is a guess/);
      expect(content).toMatch(/complete final YAML must come back verbatim/);
    });

    it('bounds the iteration, since the subagent shares the run step limit', () => {
      expect(content).toMatch(/at most five attempts/);
    });

    it('keeps the build subagent off the fast model', () => {
      expect(content).toMatch(/\*\*Never run the build subagent on `effort: low`\.\*\*/);
      expect(content).toMatch(/`low` routes the subagent to the fast model/);
      expect(content).toMatch(/Leave `effort` at its default\s+or set it higher/);
    });

    it('has the subagent bring back the pilot run time and unit count', () => {
      expect(content).toMatch(/together with the pilot's run time/);
      expect(content).toMatch(/`started_at` and `finished_at`/);
      expect(content).toMatch(
        /what the pilot cost: how many units it wrote and how long the\s+successful run took/
      );
    });

    it('states the full-run time estimate from the pilot before the save, as a rough figure', () => {
      expect(content).toMatch(
        /\*\*State the time estimate from the pilot in the same message\.\*\*/
      );
      expect(content).toMatch(
        /divide to get a per-unit time, and multiply by the\s+number of units the saved run will write/
      );
      expect(content).toMatch(/units, not rows/);
      expect(content).toMatch(/Say \*roughly\*/);
      expect(content).toMatch(/neither a\s+floor nor a ceiling/);
      expect(content).not.toMatch(/Say \*at least\*|a straight-line projection is a floor/);
      expect(content).toMatch(/Show the three numbers, not only the result/);
    });

    it('flags a projection over one hour in bold between siren markers', () => {
      expect(content).toMatch(
        /\*\*When the projection exceeds one hour, put the estimate in bold between 🚨 markers\*\*/
      );
      expect(content).toMatch(
        /"🚨 \*\*The full run over 100 units will take roughly 80 minutes\*\* 🚨"/
      );
      expect(content).toMatch(/Under an hour, write it in plain text/);
    });

    it('reports token usage only when the execution carries it', () => {
      expect(content).toMatch(/Report token usage only when the execution\s+result carries it/);
      expect(content).toMatch(/say the token count was not measured rather than estimating one/);
    });

    it('has the subagent load the skill by id rather than search for an id it was given', () => {
      expect(content).toMatch(/`load_skill` on `ai-index-automations`/);
      expect(content).toMatch(/do not reach for\s+`search_relevant_skills`/);
    });

    it('keeps the subagent off workflow-authoring, which teaches the flow this replaces', () => {
      expect(content).toMatch(/Do not load it to author one of these/);
      expect(content).toMatch(/do not send it to `workflow-authoring`/);
      expect(content).toMatch(/One skill is enough/);
    });

    it('forbids generation outright, since unbinding the tool cannot remove it', () => {
      expect(content).toMatch(/\*\*Do not generate a workflow\.\*\*/);
      expect(content).toMatch(/must not call `platform\.core\.generate_workflow`/);
    });

    it('does not claim every agent has generate_workflow, since the Context Engine agent does not', () => {
      expect(content).not.toMatch(/in every agent's default\s+toolset/);
      expect(content).toMatch(/the default agent has it; the Context\s+Engine agent does not/);
    });

    it('keeps the attachment read-only, against the generic guidance that offers an update', () => {
      expect(content).toMatch(/a handoff, not a workspace/);
      expect(content).toMatch(/do not try to write back to it with `attachment_update`/);
    });

    it('restates the rules in the brief, since a skill loaded late cannot govern earlier calls', () => {
      expect(content).toMatch(/restated in the prompt rather than left to the skill/);
      expect(content).toMatch(/cannot govern the first/);
    });

    it('points at the referenced-file path instead of browsing the filesystem', () => {
      expect(content).toMatch(/among its `referenced_files` with\s+absolute paths/);
      expect(content).toMatch(/nothing to go looking for with `list_files`/);
    });

    it('explains the five-match cliff that makes keyword step lookups useless', () => {
      expect(content).toMatch(/only when the query matches five types or fewer/);
      expect(content).toMatch(/Pass `stepType` with an exact id/);
    });

    it('names the closed set of step types, so lookups can be targeted', () => {
      for (const stepType of [
        '`elasticsearch.esql.query`',
        '`elasticsearch.search`',
        '`elasticsearch.request`',
        '`ai.prompt`',
        '`parallel`',
        '`foreach`',
        '`if`',
        '`data.set`',
        '`console`',
      ]) {
        expect(content).toContain(stepType);
      }
    });

    it('asks for one examples call rather than one per step', () => {
      expect(content).toMatch(/one call for the example library rather than one per step/);
    });

    it('names the default connector for every prompt step, inside and outside the templates', () => {
      expect(content).toMatch(
        /set its\s+`connector-id` to `\.google-gemini-3\.5-flash-chat_completion`/
      );
      expect(content).toMatch(/default model for\s+every prompt step in every automation/);
      expect(content).toMatch(
        /a\s+workflow you assemble outside the templates carries it too, on each `ai\.prompt` and `ai\.agent`\s+step/
      );
      expect(content).toMatch(/Use a different connector only when the user names one/);
    });

    it('says the templates carry the default connector and it is not a placeholder', () => {
      expect(content).toMatch(
        /Every `ai\.prompt` step in the templates carries `connector-id: \.google-gemini-3\.5-flash-chat_completion`/
      );
      expect(content).toMatch(/That is the default, not a placeholder/);
      expect(content).toMatch(
        /put the same id on any prompt step you add or write outside the templates/
      );
    });

    it('requires ${{ }} for non-strings, since {{ }} stringifies objects and booleans', () => {
      expect(content).toMatch(/Anything that is not a string needs `\$\{\{ \}\}`, not `\{\{ \}\}`/);
      expect(content).toMatch(/`\[object Object\]`/);
      expect(content).toMatch(/the string `"false"`, which\s+is truthy/);
    });

    it('points ai.prompt references at output.content rather than the flat path', () => {
      expect(content).toMatch(/nested under `output\.content`/);
      expect(content).toMatch(/`steps\.<name>\.output\.content\.<field>`/);
      expect(content).toMatch(/never\s+`steps\.<name>\.output\.<field>`/);
    });

    it('explains that both mistakes survive validation, so drafting is the only place to catch them', () => {
      expect(content).toMatch(/Both of these parse, validate and run/);
    });

    it('expands tags before filtering, since == skips multivalued rows', () => {
      expect(content).toContain(
        `Query\nthe tag back with \`${contextEngineAiIndexTools.queryAiIndices}\``
      );
      expect(content).toMatch(/\| MV_EXPAND tags\n\| WHERE tags == "ce-pilot-<runId>"/);
      expect(content).toMatch(/`MV_EXPAND tags` is not optional/);
      expect(content).toMatch(/skips multivalued\s+rows outright/);
    });

    it('reads pilot output by KI id and shows its references, not the backing _id', () => {
      expect(content).toMatch(/\| KEEP id, title, type, content, attributes, references\n/);
      expect(content).not.toMatch(/FROM <destination> METADATA _id\n\| MV_EXPAND tags/);
    });

    it('cleans up by KI ids read through the space-scoped tool, never a raw backing-store query', () => {
      const prose = content.replace(/\s+/g, ' ');

      expect(prose).toContain('Read the ids first with `platform.context_engine.query_ai_indices`');
      expect(content).toMatch(/\| WHERE tags == "ce-pilot-<runId>"\n\| STATS BY id\n/);
      expect(prose).toContain(
        'a `foreach` over `consts.ki_ids` calling `context-engine.deleteKi` with `ki_id` set to each `id`'
      );
      expect(content).not.toMatch(/an `elasticsearch\.esql\.query` selecting `id`/);
    });

    it('confirms cleanup through the query tool, which hides deleted revisions', () => {
      expect(content).toMatch(
        /FROM <destination>\n\| MV_EXPAND tags\n\| WHERE tags == "ce-pilot-<runId>"\n\| LIMIT 1/
      );
      expect(content).not.toMatch(/\| INLINE STATS latest = MAX\(@timestamp\) BY id/);
    });

    it('warns that the unexpanded query looks like a pilot that wrote nothing', () => {
      expect(content).toMatch(/returns nothing at all — which reads exactly like a pilot/);
    });

    it('requires the pilot to tag its indicators and delete them afterwards', () => {
      expect(content).toContain('ce-pilot-');
      expect(content).toContain('context-engine.deleteKi');
      expect(content).toMatch(/cleanup is not optional/);
    });

    it('isolates pilot writes by prefixing ki_id with the run tag', () => {
      expect(content).toMatch(
        /Prefix the\s+`ki_id` on `context-engine\.createKi` with the same `ce-pilot-<runId>-`/
      );
      expect(content).toMatch(/the `ce-pilot-\*` prefix from `ki_id`/);
    });

    it('puts the pilot tag where the templates build the indicator, not on the write step', () => {
      expect(content).toMatch(/tag goes on that step's `ki\.tags` list/);
      expect(content).toMatch(/not on\s+`context-engine\.createKi`/);
    });

    it('points the pilot bound at the install tool arguments and custom workflow consts', () => {
      expect(content).toMatch(
        /`maxUnits`, `maxDocuments` and\n`corpusFilter` are arguments to the install tool/
      );
    });

    it('saves the piloted definition rather than a regenerated one', () => {
      expect(content).toMatch(/Save the YAML exactly as the subagent returned it/);
    });

    it('does not pay for a validate call before a run that validates anyway', () => {
      expect(content).toMatch(/Do not validate and then run/);
      expect(content).toMatch(/parses and validates before a single step executes/);
    });

    it('says what a separate validate call adds over a failed run', () => {
      expect(content).toMatch(/warnings the execution path drops/);
      expect(content).toMatch(/definitions of every built-in and connector step type/);
    });

    it('writes out the context-engine step contracts, which no discovery tool can return', () => {
      expect(content).toContain('The `context-engine` step contracts');
      expect(content).toMatch(/no discovery tool can see them/);

      for (const stepType of [
        'context-engine.createKi',
        'context-engine.updateKi',
        'context-engine.deleteKi',
        'context-engine.verifyKi',
      ]) {
        expect(content).toContain(stepType);
      }
    });

    it('names both verifier ids, since an unknown id fails the step', () => {
      expect(content).toContain('esql-valid-syntax');
      expect(content).toContain('esql-valid-runtime');
    });

    it('states the createKi id rules that make a re-run idempotent, on both destinations', () => {
      expect(content).not.toMatch(/`ki_id` is rejected/);
      expect(content).toMatch(/On an index the same `ki_id` replaces the indicator/);
      expect(content).toMatch(/on a data stream it appends a new\s+revision/);
    });

    it('shows references and expires_at in the createKi contract, and what the step stamps', () => {
      expect(content).toMatch(/references: # optional, <= 100 entries/);
      expect(content).toMatch(/relation: 'derived_from'/);
      expect(content).toMatch(/expires_at: '[^']+' # optional/);
      expect(content).toMatch(
        /`id`, `updated_at` and `governance\.provenance` are stamped by the step; never supply them/
      );
    });

    it('describes deleteKi per destination, since a data stream keeps the deleted revision', () => {
      expect(content).toMatch(/On an index `deleteKi` removes the document/);
      expect(content).toMatch(
        /on a data stream it appends a revision with\s+`governance\.lifecycle\.status: deleted`/
      );
    });

    it('names the updateKi lifecycle and force inputs', () => {
      expect(content).toMatch(/`lifecycle: \{ status: active \| deleted \}`/);
      expect(content).toMatch(/`force: true`/);
    });

    it('allows custom verifier workflows while keeping the verifier list non-empty', () => {
      expect(content).toMatch(/`\{ workflow_id \}`/);
      expect(content).toMatch(/non-empty, duplicate-free `verifiers` list/);
    });

    it('asks the brief for the ids a targeted KI turns into references', () => {
      expect(content).toMatch(
        /the provenance ids \(`trace_ids`, `conversation_id`, the source index and document id\) that\s+become its `references`/
      );
    });

    it('bounds what a KI attribute can hold, since indicators carry ES|QL in one', () => {
      expect(content).toMatch(/never nested objects/);
      expect(content).toContain('10,000 characters');
    });

    it('says why updateKi is not interchangeable with createKi', () => {
      expect(content).toMatch(/It fails when the indicator does not\s+exist/);
      expect(content).toMatch(/not a substitute\s+for\s+`createKi`/);
    });

    it('names the check validation does not cover, since a valid draft can still match nothing', () => {
      expect(content).toMatch(/does \*\*not\*\* establish that a query inside it returns anything/);
      expect(content).toContain(platformCoreTools.executeEsql);
    });

    it('does not let piloting a workflow be read as licence to run the saved one', () => {
      expect(content).toContain('Running one is a separate decision');
      expect(content).toMatch(/Running the saved automation is not the same act/);
    });

    it('gives save and run each their own confirmation dialog', () => {
      expect(content).toMatch(/two separate operations, each with its own confirmation\s+dialog/);
    });

    it('carries the workflow syntax itself, rather than depending on another skill for it', () => {
      expect(content).toContain('The rest of the syntax these automations use');
      expect(content).toMatch(/An `if` condition is KQL, not Liquid/);
      expect(content).toContain('iteration-on-failure');
      expect(content).toContain('on-failure');
    });

    it('notes the ES|QL row cap, which otherwise truncates a large corpus silently', () => {
      expect(content).toContain('10,000');
    });

    it('points at the skills on either side of it', () => {
      expect(content).toContain('analyze-and-improve');
      expect(content).toContain('ai-index-sources');
    });
  });

  describe('the KI budget', () => {
    const content = aiIndexAutomationsSkill.content;
    const catalog =
      (aiIndexAutomationsSkill.referencedContent ?? []).find(
        ({ name }) => name === STRATEGY_CATALOG_REFERENCE_NAME
      )?.content ?? '';

    it('keeps the template bounds within the budget instead of inviting a larger run', () => {
      expect(content).toMatch(/It defaults to 100, the KI budget;\s+keep it within that budget/);
      expect(content).toMatch(/Keep `maxDocuments` within the KI budget/);
      expect(content).not.toMatch(/defaults to 25/);
      expect(content).not.toMatch(/raise it\s+deliberately/);
    });

    it('points the subagent brief at the budget rather than multiplying it per claim', () => {
      expect(content).toMatch(/the KI budget: at most 100 KIs per run during onboarding/);
      expect(content).not.toMatch(/multiplied by the claims per document/);
    });

    it('states the budget once in the catalog, with the bound a fan-out workflow writes for itself', () => {
      expect(catalog).toMatch(/at most 100 during\s+onboarding/);
      expect(catalog).toMatch(
        /bound that count\s+with `maxItems` on the array in the `ai\.prompt` output schema/
      );
      expect(catalog).toMatch(
        /set the workflow's own `max_documents` const to 100 ÷ N, rounded down/
      );
      expect(catalog).toMatch(/fails the step rather than being cut short/);
      expect(catalog).not.toMatch(/1,000 KIs/);
    });

    it('lets the agent tell the user the KI count without presenting the budget as a limit', () => {
      expect(catalog).toMatch(/tell the user how many KIs a\s+run will write/);
      expect(catalog).toMatch(/do not present the budget itself as a limit or a policy/);
    });
  });

  describe('index metadata over several sources', () => {
    const prose = aiIndexAutomationsSkill.content.replace(/\s+/g, ' ');

    it('installs once for every source of the AI index, one KI per source', () => {
      expect(prose).toMatch(/Pass `sources`, one `\{ index, categoryField \}` per source/);
      expect(prose).toMatch(/one install and one run write one KI per source/);
      expect(prose).not.toMatch(/Pass `sourceIndex` and `categoryField`, a keyword field/);
    });
  });

  describe('piloting a template install', () => {
    const prose = aiIndexAutomationsSkill.content.replace(/\s+/g, ' ');

    it('pilots any template install that writes more than 5 items, with a pilot of 5', () => {
      expect(prose).toMatch(
        /\*\*Pilot a template install that writes more than 5 items before its full run\.\*\*/
      );
      expect(prose).toMatch(
        /documents \(up to `maxDocuments`\), units \(up to `maxUnits`\) or sources for Index\/Table Metadata/
      );
      expect(prose).toMatch(/`run_automation` with `pilotSize: 5` first/);
      expect(prose).not.toMatch(/pilotSize: 3/);
    });

    it('runs a Targeted KI writer without a pilot, through execute_workflow', () => {
      expect(prose).toMatch(
        /A Targeted KI writer has no pilot: it makes no model call, and it runs through `platform\.core\.execute_workflow` as described above/
      );
    });

    it('exempts the Targeted KI writer in the pilot rule itself, before the counting', () => {
      const rule = prose.slice(prose.indexOf('**Pilot a template install'));
      expect(rule.indexOf('A Targeted KI writer has no pilot')).toBeLessThan(
        rule.indexOf('Count the items')
      );
    });

    it('says where the item count comes from', () => {
      expect(prose).toMatch(
        /take the count from the Unit section of the proposal, or from a count query with the corpus filter when there is no proposal/
      );
      expect(prose).toMatch(/for Index\/Table Metadata, the number of `sources`/);
    });

    it('handles a pilot that did not complete next to the projection, not after the no-pilot case', () => {
      const skipAt = prose.indexOf('**With 5 items or fewer, skip the pilot**');
      expect(prose.indexOf('When the pilot ended with any `status` other than')).toBeLessThan(
        skipAt
      );
    });

    it('sizes the pilot to one batch of the template loop, which runs five at a time', () => {
      expect(prose).toMatch(
        /Every template's loop runs five items at a time, so a pilot of 5 is one batch of the full run/
      );
    });

    it('projects the full run from the pilot, states it, then starts the full run', () => {
      expect(prose).toMatch(
        /project the full run from `durationMs` and `kisWritten` as the time estimate above lays out/
      );
      expect(prose).toMatch(/Then call `run_automation` again without `pilotSize`/);
      expect(prose).toMatch(/The full run replaces the pilot's indicators/);
      expect(prose).toMatch(
        /on an AI index backed by a data stream it adds a newer revision of each instead/
      );
      expect(prose).toMatch(
        /If the user declines it, the pilot's indicators stay in the index: say so/
      );
    });

    it('projects only from a pilot whose every item wrote a KI, and reports a partial one', () => {
      expect(prose).toMatch(/returns `status`, `durationMs` and `kisWritten`/);
      expect(prose).toMatch(/Project only when `kisWritten` equals the pilot size/);
      expect(prose).toMatch(
        /When it is lower, say how many of the pilot's items wrote a KI and stop/
      );
      expect(prose).not.toMatch(/the pilot wrote three units;/);
    });

    it('puts the over-an-hour warning and the cheaper option before the full-run dialog', () => {
      expect(prose).toMatch(
        /When it exceeds an hour, give the 🚨 warning and the cheaper option you would take in the same message\. Then call `run_automation` again/
      );
    });

    it('skips the pilot only when the run writes 5 items or fewer, and says why', () => {
      expect(prose).toMatch(
        /\*\*With 5 items or fewer, skip the pilot\*\*: it would be the full run\. Say the run covers only that many items, so there is no time estimate, and start it/
      );
      expect(prose).not.toMatch(/Skip the pilot for Index\/Table Metadata/);
      expect(prose).not.toMatch(/which writes indicators that were already agreed/);
    });

    it('handles a pilot that did not complete without starting the full run', () => {
      expect(prose).toMatch(
        /When the pilot ended with any `status` other than `completed`, report `errorMessage` and stop/
      );
      expect(prose).toMatch(/When it is still `running`, say the time is not yet measured/);
    });

    it('says a full run returns at once while a pilot waits', () => {
      expect(prose).toMatch(/A full run returns immediately with `executionId` and `workflowUrl`/);
    });
  });

  describe('template argument caveats', () => {
    const prose = aiIndexAutomationsSkill.content.replace(/\s+/g, ' ');

    it('requires numeric metric fields, since AVG fails the query on any other type', () => {
      expect(prose).toMatch(/each numeric in the mapping: `AVG` over any other type fails/);
    });

    it('warns that reinstalling a single-index metadata automation leaves its old KI behind', () => {
      expect(prose).toMatch(/Each KI's id is `<name>\/<index>`/);
      expect(prose).toMatch(/leaves that old KI in place: tell the user it is now stale/);
    });
  });

  describe('the unit profile template', () => {
    const content = aiIndexAutomationsSkill.content;
    const prose = content.replace(/\s+/g, ' ');
    const catalog =
      (aiIndexAutomationsSkill.referencedContent ?? []).find(
        ({ name }) => name === STRATEGY_CATALOG_REFERENCE_NAME
      )?.content ?? '';

    it('describes only the arguments the install tool accepts', () => {
      for (const dropped of ['catalogIndex', 'catalogKey', 'discoveryFilter']) {
        expect(content).not.toContain(dropped);
      }
      expect(prose).toMatch(/Pass `corpusFilter`, a `WHERE` line, to profile only some units/);
      expect(prose).toMatch(/\*\*Pass `metricFields`\.\*\*/);
    });

    it('describes the single ranked discovery query rather than a cursor it does not have', () => {
      expect(prose).not.toMatch(/pages through the units on a keyword cursor/);
      expect(prose).not.toMatch(/`unit-profile-template` pages with a `while`/);
      expect(prose).toMatch(/one ranked query capped at `maxUnits`/);
    });

    it('sends a unit that needs a second index to a custom workflow', () => {
      expect(prose).toMatch(
        /The template reads one index\. A unit that needs data from a second index .* is a custom workflow built through a subagent/
      );
      expect(catalog).toMatch(
        /one index for the `unit_profile` template; a unit drawn from several\s+indices is a custom workflow/
      );
      expect(catalog).not.toMatch(/from one or several indices/);
    });

    it('prefers a readable unit key over an opaque id', () => {
      expect(prose).toMatch(
        /prefer a human-readable field such as `product_name` over `product_id`/
      );
    });
  });

  describe('reinstalling a template', () => {
    const content = aiIndexAutomationsSkill.content;

    it('replaces by name rather than always replacing what the template attached', () => {
      expect(content).not.toMatch(/calling it again replaces\s+the automation that template/i);
      expect(content).not.toMatch(/Calling it again replaces/);
      expect(content).not.toMatch(/Calling the tool again replaces/);
      expect(content).not.toMatch(/It does not add a second automation/);
    });

    it('states the name rule wherever the install tool is introduced', () => {
      const prose = content.replace(/\s+/g, ' ');
      const nameRule =
        /the same template with the same `name` replaces that automation in place.{0,80}a different `name` adds another/gi;
      expect((prose.match(nameRule) ?? []).length).toBeGreaterThanOrEqual(3);
    });

    it('warns that an automation installed before names were required is never replaced', () => {
      expect(content.replace(/\s+/g, ' ')).toMatch(
        /An automation installed before names were required, such as "Document KI automation", is never replaced: delete it first/
      );
    });
  });
});
