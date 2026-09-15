/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import {
  KI_SHAPES_REFERENCE_NAME,
  STRATEGY_CATALOG_REFERENCE_NAME,
} from '../context_engine_shared';
import {
  aiIndexAutomationsSkill,
  DOCUMENT_TEMPLATE_NAME,
  INDEX_METADATA_TEMPLATE_NAME,
  TARGETED_KI_WRITER_TEMPLATE_NAME,
  UNIT_PROFILE_TEMPLATE_NAME,
} from './ai_index_automations_skill';

const TEMPLATE_NAMES: readonly string[] = [
  INDEX_METADATA_TEMPLATE_NAME,
  UNIT_PROFILE_TEMPLATE_NAME,
  DOCUMENT_TEMPLATE_NAME,
  TARGETED_KI_WRITER_TEMPLATE_NAME,
];

const templates = () =>
  (aiIndexAutomationsSkill.referencedContent ?? []).filter(({ name }) =>
    TEMPLATE_NAMES.includes(name)
  );

// Splits a template into its `ai.prompt` step blocks: from the step's `- name:` line to the next
// sibling `- name:` at the same indentation, so a rule about every prompt can be checked per step.
const aiPromptBlocks = (yaml: string): string[] => {
  const lines = yaml.split('\n');
  const blocks: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const nameMatch = lines[index].match(/^(\s*)- name: /);
    if (!nameMatch || !/^\s*type: ai\.prompt\s*$/.test(lines[index + 1] ?? '')) {
      continue;
    }
    const indent = nameMatch[1];
    let end = index + 1;
    while (end < lines.length && !lines[end].startsWith(`${indent}- name: `)) {
      end++;
    }
    blocks.push(lines.slice(index, end).join('\n'));
  }
  return blocks;
};

describe('aiIndexAutomationsSkill', () => {
  it('registers with stable id, name, and context-engine base path', () => {
    expect(aiIndexAutomationsSkill.id).toBe('ai-index-automations');
    expect(aiIndexAutomationsSkill.name).toBe('ai-index-automations');
    expect(aiIndexAutomationsSkill.basePath).toBe('skills/platform/context-engine');
  });

  it('is present in the built-in skills allow list', () => {
    expect(isAllowedBuiltinSkill(aiIndexAutomationsSkill.id)).toBe(true);
  });

  it('is gated behind experimental features', () => {
    expect(aiIndexAutomationsSkill.experimental).toBe(true);
  });

  it('ships non-empty markdown content', () => {
    expect(typeof aiIndexAutomationsSkill.content).toBe('string');
    expect(aiIndexAutomationsSkill.content.length).toBeGreaterThan(0);
  });

  it('carries one workflow template per strategy that ships with one, plus the shared references', () => {
    const names = (aiIndexAutomationsSkill.referencedContent ?? []).map(({ name }) => name);

    expect(names).toEqual([
      'index-metadata-template',
      'unit-profile-template',
      'document-template',
      'targeted-ki-writer',
      KI_SHAPES_REFERENCE_NAME,
      STRATEGY_CATALOG_REFERENCE_NAME,
    ]);
  });

  it('ships each template as a complete workflow rather than a fragment', () => {
    for (const reference of templates()) {
      expect(reference.relativePath).toBe('.');
      // A template is only a starting point if it runs: it needs the sink, the gate that guards
      // it, and the `consts` block that is the whole of the adaptation.
      expect(reference.content).toContain('consts:');
      expect(reference.content).toContain('ai_index_id');
      expect(reference.content).toContain('context-engine.verifyKi');
      expect(reference.content).toContain('context-engine.createKi');
      expect(reference.content).toContain('esql-valid-runtime');
    }
  });

  it('pins no connector in any template, so ai.prompt resolves the default at run time', () => {
    for (const reference of templates()) {
      expect(reference.content).not.toContain('connector-id');
    }
  });

  it('retries every ai.prompt, since a transient model failure otherwise costs the unit', () => {
    const blocks = templates().flatMap(({ content: yaml }) => aiPromptBlocks(yaml));

    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).toMatch(/on-failure:\n\s+retry:\n\s+max-attempts: 3/);
      expect(block).toMatch(/strategy: exponential/);
      expect(block).toMatch(/jitter: true/);
    }
  });

  it('pages the unit template on a cursor and skips units whose source has not changed', () => {
    const unitTemplate = templates().find(({ name }) => name === UNIT_PROFILE_TEMPLATE_NAME);

    expect(unitTemplate?.content).toContain('type: while');
    expect(unitTemplate?.content).toMatch(/variables\.cursor/);
    expect(unitTemplate?.content).toMatch(/\| last \| first/);
    expect(unitTemplate?.content).toContain('type: loop.continue');
    expect(unitTemplate?.content).toContain('source_updated_at');
    // The three strategy answers as consts.
    for (const constName of [
      'unit_index:',
      'unit_key:',
      'freshness_field:',
      'catalog_index:',
      'discovery_filter:',
      'batch_size:',
    ]) {
      expect(unitTemplate?.content).toContain(constName);
    }
  });

  it('writes targeted KIs without a model call, from consts, with provenance keys', () => {
    const writer = templates().find(({ name }) => name === TARGETED_KI_WRITER_TEMPLATE_NAME);

    expect(writer?.content).not.toContain('ai.prompt');
    expect(writer?.content).toContain('type: constraint');
    for (const key of ['trace_ids:', 'conversation_id:', 'error_text:', 'source_index:']) {
      expect(writer?.content).toContain(key);
    }
    expect(writer?.content).toMatch(/ki: "\$\{\{ foreach\.item\.ki \}\}"/);
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
      `${internalNamespaces.workflows}.validate_workflow`,
      `${internalNamespaces.workflows}.get_workflow`,
      `${internalNamespaces.workflows}.get_step_definitions`,
      `${internalNamespaces.workflows}.get_trigger_definitions`,
      `${internalNamespaces.workflows}.get_examples`,
      `${internalNamespaces.workflows}.get_connectors`,
      `${internalNamespaces.workflows}.workflow_execute_step`,
    ]);
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
      expect(content).toContain('context-engine.verifyKi');
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
      expect(content).toMatch(/Index\/Table Metadata.*\n?.*`index-metadata-template`/);
      expect(content).toMatch(/Bottom-Up.*\n?.*`document-template`/);
      expect(content).toMatch(/Cumulative \/ Wiki-style.*\n?.*`unit-profile-template`/);
      expect(content).toMatch(/Targeted KIs.*\n?.*`targeted-ki-writer`/);
      expect(content).not.toContain('entity-profile-template');
    });

    it('describes the unit template as the three strategy answers written into consts', () => {
      expect(content).toMatch(/`unit_index` and `unit_key` are the unit/);
      expect(content).toMatch(/how units are found and refreshed/);
      expect(content).toMatch(
        /`loop\.continue` past the unit when its `freshness_field` has\s+not moved/
      );
    });

    it('has the brief carry the three strategy answers and the counted findings', () => {
      expect(content).toMatch(/\*\*as its three answers\*\*/);
      expect(content).toMatch(/\*\*the counted findings\*\*/);
      expect(content).toMatch(/what is not in the brief is not in the KI/i);
    });

    it('requires retry on every ai.prompt and says why', () => {
      expect(content).toMatch(/\*\*Retry every `ai\.prompt`\*\*/);
      expect(content).toMatch(/three attempts, exponential delay and\s+jitter/);
    });

    it('points at the shared references for the shape and the catalog instead of restating them', () => {
      expect(content).toContain(`\`${KI_SHAPES_REFERENCE_NAME}\``);
      expect(content).toContain(`\`${STRATEGY_CATALOG_REFERENCE_NAME}\``);
      expect(content).not.toMatch(/\| `title` \| text \+ semantic \|/);
    });

    it('documents while, variables and loop.continue, which the unit template depends on', () => {
      expect(content).toMatch(/\*\*A `while` pages through a corpus/);
      expect(content).toMatch(/readable as `variables\.<key>`/);
      expect(content).toMatch(/\*\*`loop\.continue` skips the rest of an iteration\*\*/);
    });

    it('never reruns a failed call unchanged', () => {
      expect(content).toMatch(/Never rerun a\s+failed call unchanged/);
    });

    it('points the strategies without a template at the one to start from', () => {
      expect(content).toMatch(/Selective \/ Outlier.*\n?.*start from `document-template`/);
      expect(content).toMatch(/Atomic Facts.*\n?.*start from `document-template`/);
      expect(content).toMatch(/Detection \/ Feature.*\n?.*start from `index-metadata-template`/);
    });

    it('says what a template already encodes, so it is edited rather than rewritten', () => {
      expect(content).toMatch(/a fresh draft gets\s+wrong/);
      expect(content).toMatch(/Take it literally/);
      expect(content).toMatch(/none of them announce themselves/);
    });

    it('has the brief name the template, since a subagent without one writes from nothing', () => {
      expect(content).toMatch(/\*\*the template it starts from, by name\*\*/);
      expect(content).toMatch(/rediscovering what the\s+template already encodes/);
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
      expect(content).toMatch(/in every agent's default\s+toolset/);
      expect(content).toMatch(/must not call `platform\.core\.generate_workflow`/);
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
        '`foreach`',
        '`while`',
        '`if`',
        '`loop.continue`',
        '`data.set`',
        '`console`',
      ]) {
        expect(content).toContain(stepType);
      }
    });

    it('covers every step type the templates use, so none needs looking up', () => {
      const closedSet = [
        'elasticsearch.esql.query',
        'elasticsearch.search',
        'elasticsearch.request',
        'ai.prompt',
        'foreach',
        'while',
        'if',
        'loop.continue',
        'data.set',
        'console',
        'context-engine.createKi',
        'context-engine.verifyKi',
      ];

      for (const reference of templates()) {
        // Anchored on the `- name:` above it, so the `type:` keys inside an ai.prompt output
        // schema are not mistaken for step types.
        const used = [...reference.content.matchAll(/- name: [^\n]+\n\s*type: ([\w.-]+)/g)].map(
          ([, stepType]) => stepType
        );

        expect(used.length).toBeGreaterThan(0);
        expect(used.filter((stepType) => !closedSet.includes(stepType))).toEqual([]);
      }
    });

    it('asks for one examples call rather than one per step', () => {
      expect(content).toMatch(/one call for the example library rather than one per step/);
    });

    it('leaves ai.prompt unpinned so it resolves the default connector at run time', () => {
      expect(content).toMatch(/leave its\s+`connector-id` off/);
      expect(content).toMatch(/omitting it resolves the deployment's default AI\s+connector/);
    });

    it('says the templates omit connector-id deliberately, so none is added back', () => {
      expect(content).toMatch(/carry no `connector-id` on their `ai\.prompt` steps/);
      expect(content).toMatch(/Do not add one/);
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
      expect(content).toMatch(/\| MV_EXPAND tags\n\| WHERE tags == "ce-pilot-<runId>"/);
      expect(content).toMatch(/`MV_EXPAND tags` is not optional/);
      expect(content).toMatch(/skips multivalued\s+rows outright/);
    });

    it('warns that the unexpanded query looks like a pilot that wrote nothing', () => {
      expect(content).toMatch(/returns nothing at all — which reads exactly like a pilot/);
    });

    it('requires the pilot to tag its indicators and delete them afterwards', () => {
      expect(content).toContain('ce-pilot-');
      expect(content).toContain('context-engine.deleteKi');
      expect(content).toMatch(/cleanup is not optional/);
    });

    it('notes that a data stream leaves the tag as the only handle on pilot output', () => {
      expect(content).toMatch(/createKi` refuses `ki_id`/);
    });

    it('puts the pilot tag where the templates build the indicator, not on the write step', () => {
      expect(content).toMatch(/tag goes on that step's `ki\.tags` list/);
      expect(content).toMatch(/not on\s+`context-engine\.createKi`/);
    });

    it('points the pilot bound at the consts the templates already expose', () => {
      expect(content).toMatch(
        /`max_documents`, `corpus_filter`, `discovery_filter`, and `batch_size`/
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

    it('states the createKi id rules that make a re-run idempotent', () => {
      expect(content).toMatch(/Passing the same `ki_id` again replaces the indicator/);
      expect(content).toMatch(/On a data-stream destination `ki_id` is rejected/);
    });

    it('bounds what a KI attribute can hold, since indicators carry ES|QL in one', () => {
      expect(content).toMatch(/never nested objects/);
      expect(content).toContain('10,000 characters');
    });

    it('says why updateKi is not interchangeable with createKi', () => {
      expect(content).toMatch(/It fails when the indicator does not\s+exist/);
      expect(content).toMatch(/not a substitute\s+for `createKi`/);
    });

    it('names the check validation does not cover, since a valid draft can still match nothing', () => {
      expect(content).toMatch(/does \*\*not\*\* establish that a query inside it returns anything/);
      expect(content).toContain(platformCoreTools.executeEsql);
    });

    it('does not let piloting a workflow be read as licence to run the saved one', () => {
      expect(content).toContain('Running one is a separate decision');
      expect(content).toMatch(
        /do not\s+execute a saved\s+workflow unless the run you are in has told you/
      );
    });

    it('has the save tool perform the run, so a failure is reported rather than retried', () => {
      expect(content).toMatch(/starts that run itself, in its own code/);
      expect(content).toMatch(/that is the answer, not a task/);
      expect(content).toMatch(/a second attempt doubles it/);
    });

    it('does not treat the save tool run flag as an unauthorized run', () => {
      expect(content).toMatch(/approving the save approves the run/);
    });

    it('carries the workflow syntax itself, rather than depending on another skill for it', () => {
      expect(content).toContain('The rest of the syntax these automations use');
      expect(content).toMatch(/An `if` condition is KQL, not Liquid/);
      expect(content).toContain('iteration-on-failure');
      expect(content).toContain('on-failure');
    });

    it('documents every Liquid filter the templates depend on', () => {
      const templateYaml = templates()
        .map(({ content: yaml }) => yaml)
        .join('\n');
      const used = new Set(
        [...templateYaml.matchAll(/\|\s*([a-z_]+)\s*(?::|\}\}|\|)/g)].map(([, filter]) => filter)
      );

      expect(used.size).toBeGreaterThan(0);
      expect([...used].filter((filter) => !content.includes(`\`${filter}`))).toEqual([]);
    });

    it('notes the ES|QL row cap, which otherwise truncates a large corpus silently', () => {
      expect(content).toContain('10,000');
    });

    it('points at the skills on either side of it', () => {
      expect(content).toContain('analyze-and-improve');
      expect(content).toContain('ai-index-sources');
    });
  });
});
