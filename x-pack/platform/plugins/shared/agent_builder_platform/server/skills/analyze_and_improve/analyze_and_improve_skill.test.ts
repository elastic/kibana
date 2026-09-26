/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { contextEngineAiIndexTools, platformCoreTools } from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { contextEngineSkillAvailability } from '../context_engine_skill_availability';
import {
  KI_SHAPES_REFERENCE_NAME,
  STRATEGY_CATALOG_REFERENCE_NAME,
  kiShapesReference,
  strategyCatalogReference,
} from '../context_engine_shared';
import { analyzeAndImproveSkill } from './analyze_and_improve_skill';

describe('analyzeAndImproveSkill', () => {
  it('registers with stable id, name, and context-engine base path', () => {
    expect(analyzeAndImproveSkill.id).toBe('analyze-and-improve');
    expect(analyzeAndImproveSkill.name).toBe('analyze-and-improve');
    expect(analyzeAndImproveSkill.basePath).toBe('skills/platform/context-engine');
  });

  it('is present in the built-in skills allow list', () => {
    expect(isAllowedBuiltinSkill(analyzeAndImproveSkill.id)).toBe(true);
  });

  it('is gated behind experimental features', () => {
    expect(analyzeAndImproveSkill.experimental).toBe(true);
  });

  it('is not excluded from Elastic capabilities, so the default agent picks it up', () => {
    expect(analyzeAndImproveSkill.excludeFromElasticCapabilities).toBeFalsy();
  });

  it('ships non-empty markdown content', () => {
    expect(typeof analyzeAndImproveSkill.content).toBe('string');
    expect(analyzeAndImproveSkill.content.length).toBeGreaterThan(0);
  });

  it('attaches the shared KI shape and strategy catalog references, and nothing else', () => {
    const names = (analyzeAndImproveSkill.referencedContent ?? []).map(({ name }) => name);

    expect(names).toEqual([KI_SHAPES_REFERENCE_NAME, STRATEGY_CATALOG_REFERENCE_NAME]);
  });

  it('mentions every referencedContent entry by name in the skill content', () => {
    for (const reference of analyzeAndImproveSkill.referencedContent ?? []) {
      expect(analyzeAndImproveSkill.content).toContain(`\`${reference.name}\``);
    }
  });

  it('binds only the read-only tools judging an index needs', async () => {
    const toolIds = (await analyzeAndImproveSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).toEqual([
      platformCoreTools.executeEsql,
      platformCoreTools.listIndices,
      platformCoreTools.getIndexMapping,
      contextEngineAiIndexTools.listAiIndices,
      contextEngineAiIndexTools.describeAiIndex,
      contextEngineAiIndexTools.queryAiIndices,
      `${internalNamespaces.workflows}.get_workflow`,
    ]);
  });

  it('is hidden in spaces where the Context Engine is off, like the other setup skills', () => {
    expect(analyzeAndImproveSkill.availability).toBe(contextEngineSkillAvailability);
  });

  it('reads the KIs through the space-scoped AI index tools, not raw ES|QL on ai-index-*', () => {
    const { content } = analyzeAndImproveSkill;

    expect(content).not.toMatch(/`platform\.core\.execute_esql` samples them/);
    expect(content).toContain(`\`${contextEngineAiIndexTools.listAiIndices}\` lists`);
    expect(content).toContain(`\`${contextEngineAiIndexTools.queryAiIndices}\` samples them`);
  });

  it('starts trace reading from the queries the attached AI index already carries', () => {
    const { content } = analyzeAndImproveSkill;

    expect(content).toMatch(
      /When the attached AI index lists `traces`, start from each entry's `query`/
    );
    expect(content).toMatch(/whatever the entry's\s+`type`/);
  });

  it('binds no tool that writes anything, so an unattended run stays a proposer', async () => {
    const toolIds = (await analyzeAndImproveSkill.getRegistryTools?.()) ?? [];

    // Skill tools are additive to the agent's own set, so this skill staying read-only is what
    // lets an analysis run load it without gaining the ability to author or run a workflow.
    // Anything that writes lives in `ai-index-automations`, which such a run does not load.
    expect(
      toolIds.some((id) =>
        /generate_workflow|execute_workflow|createKi|updateKi|deleteKi/i.test(id)
      )
    ).toBe(false);
  });

  it('only instructs the agent to call tools that are actually bound', async () => {
    const boundTools = (await analyzeAndImproveSkill.getRegistryTools?.()) ?? [];

    // Every `platform.*` tool id the content tells the agent to call must be bound, so prose
    // cannot drift into promising a capability the skill does not hand over.
    const referencedToolIds = [
      ...new Set(
        [
          ...analyzeAndImproveSkill.content.matchAll(
            /platform\.(?:core|workflows|context_engine)\.[a-z_]+/g
          ),
        ].map(([match]) => match)
      ),
    ];

    expect(referencedToolIds.length).toBeGreaterThan(0);
    expect(referencedToolIds.filter((toolId) => !boundTools.includes(toolId))).toEqual([]);
  });

  describe('content', () => {
    const { content } = analyzeAndImproveSkill;

    it('names each skill it delegates the mechanics to', () => {
      expect(content).toContain('context-engine-signals');
      expect(content).toContain('ai-index-sources');
      expect(content).toContain('ai-index-automations');
    });

    it('explains that staying read-only is why the split exists', () => {
      expect(content).toMatch(/Loading a skill adds its tools to yours/);
    });

    it('leaves applying versus proposing to the run rather than deciding it in the skill', () => {
      expect(content).toContain('Propose or apply — the run decides');
    });

    it('forbids hand-writing KIs, which would leave the producing automation unfixed', () => {
      expect(content).toContain('Never write knowledge indicator documents directly');
    });

    it('keeps the judgement it owns: what a KI is, its shape, and the strategies', () => {
      expect(content).toContain('What a knowledge indicator is');
      expect(content).toContain('KI document shape');
      expect(content).toContain('Access patterns');
      expect(content).toContain('Strategy catalog');
    });

    it('points at the shared references instead of restating the shape and the table', () => {
      // The field table and the six-row strategy table now live in the shared references, so a
      // copy here would be the drift the references exist to prevent.
      expect(content).not.toMatch(/\| `title` \| text \+ semantic \|/);
      expect(content).not.toMatch(/\| \*\*Bottom-Up\*\* \| One KI per document \|/);
      expect(content).toMatch(/`ki_shapes` reference attached to this skill/);
      expect(content).toMatch(/`strategy_catalog` reference attached to this skill/);
    });

    it('opens with a scope step, so evidence is read for a named index and window', () => {
      expect(content).toContain('## Scope comes first');
      expect(content).toMatch(/\*\*The AI index\*\*/);
      expect(content).toMatch(/\*\*The window\*\*/);
      expect(content).toMatch(/Do not invent a scope/);
    });

    it('scopes evidence by what the user chose, so a fresh sources-only index is not probed for signals', () => {
      expect(content).toMatch(/decided by what the user chose, not by probing/);
      expect(content).toMatch(
        /Sources\s+only, nothing built yet:.*do not\s+query for signals or traces/s
      );
      expect(content).toMatch(/The user brought traces in, or the index already has automations/);
      expect(content).toMatch(
        /\*\*Sources only, and nothing built yet\.\*\* This is the setup case\. Do not go looking for signals/
      );
      expect(content).not.toMatch(/whether signals exist for/);
    });

    it('states a strategy as three answers, with the named strategies as worked examples', () => {
      expect(content).toMatch(/\*\*The unit\*\*/);
      expect(content).toMatch(/\*\*What one KI carries\*\*/);
      expect(content).toMatch(/\*\*How units are found and refreshed\*\*/);
      expect(content).toMatch(/as worked examples of those three answers/);
      expect(content).toMatch(/unsure means Index\/Table Metadata/);
    });

    it('offers only the refresh cadences the templates implement', () => {
      // The templates regenerate every unit on a re-run, so an incremental refresh is not a choice.
      for (const text of [content, strategyCatalogReference.content]) {
        expect(text).toMatch(/re-profiled on every run, or never for\s+immutable\s+facts/);
        expect(text).not.toMatch(/only when its source changed|source has not changed/);
      }
      expect(strategyCatalogReference.content).toMatch(
        /\| \*\*Cumulative \/ Wiki-style\*\* \|[^\n]*\| Every run, replacing each unit \|/
      );
    });

    it('makes prevalence a requirement on every finding', () => {
      expect(content).toMatch(/\*\*It carries a count, a denominator and a window\.\*\*/);
      expect(content).toMatch(/This is the prevalence rule, and it is a\s+requirement/);
    });

    it('reads traces through the platform skill, for four things, without a loop count', () => {
      expect(content).toContain('## When traces are in scope');
      expect(content).toContain('agent-builder-traces');
      expect(content).toMatch(/pull four things/);
      expect(content).toMatch(/\*\*Rounds where the agent queried the raw indices/);
      expect(content).toMatch(/\*\*ES\|QL errors against those indices\.\*\*/);
      expect(content).toMatch(
        /\*\*Conversations touching those indices with high token or latency cost\*\*/
      );
      expect(content).toMatch(/\*\*Rounds that ended in a soft failure\*\*/);
      expect(content).toMatch(/Do not count how many queries a round ran as evidence/);
    });

    it('offers targeted KIs as a proposal outcome, with provenance from ids that already exist', () => {
      expect(content).toContain('### Targeted KIs as an outcome');
      for (const kind of ['`constraint`', '`workaround`', '`disambiguation`', '`task_recipe`']) {
        expect(content).toContain(kind);
      }
      expect(content).toMatch(/never written by hand/);
      expect(content).toMatch(/the ids that already exist/);
      expect(content).not.toMatch(/finding_id|investigation_id/);
    });

    it('carries the two discipline rules, one line each', () => {
      expect(content).toMatch(
        /\*\*Define a term where it first appears, then use the plain phrase\.\*\*/
      );
      expect(content).toMatch(/\*\*Never resend a failed tool call unchanged\.\*\*/);
      expect(content).not.toMatch(/## Glossary/);
    });

    it('sends the setup case to sources after the strategy, not before the evidence', () => {
      expect(content).toMatch(/Load `ai-index-sources` after the\s+strategy/);
    });

    it('keeps the corpus filter as a diagnosis, delegating how to configure one', () => {
      expect(content).toContain('The corpus filter');
      expect(content).toMatch(/coverage-gap finding that does not\s+say which it is/);
    });

    it('calibrates confidence for findings only, and keeps it off the KI', () => {
      expect(content).toMatch(
        /Confidence is something you state about a finding, never something a KI carries/
      );
      expect(content).not.toContain('attributes.confidence');
      expect(content).toMatch(/0\.9–1\.0/);
      expect(content).toContain('Do not emit');
    });

    it('says KI quality is judged at the pilot inspection, not self-reported', () => {
      expect(content).toMatch(/judged at the pilot inspection step in `ai-index-automations`/);
      expect(content).toMatch(/asking the model to grade itself/);
    });

    it('requires one sampling query per source and one probe per claimed join before proposing', () => {
      expect(content).toContain('## Ground the proposal in the data before writing it');
      expect(content).toMatch(/\*\*A row sample and a row count per source in scope\.\*\*/);
      expect(content).toMatch(/\*\*One probe per join or identifier the proposal names\.\*\*/);
      expect(content).toMatch(/STATS total = COUNT\(\*\), populated = COUNT\(<field>\)/);
      expect(content).toMatch(/<index>\.<field>: <populated> of <total> populated/);
      expect(content).toMatch(/A key populated on neither side\s+is not a join/);
    });

    it('budgets every query the proposal needs, the unit count included, and no profiling', () => {
      expect(content.replace(/\s+/g, ' ')).toContain(
        'That is the whole budget: a row sample and a row count per source, a populated count per side of each claimed join, and one unit count for a per-unit strategy. Do not profile the index'
      );
      expect(content).toMatch(/\*\*One unit count for a per-unit strategy\.\*\*/);
      expect(content).toMatch(/STATS units = COUNT_DISTINCT\(<unit_key>\)/);
      expect(content).not.toMatch(/one query per source and one per claimed join/);
    });

    it('fixes the proposal shape, with Evidence and Cost required and Example questions optional', () => {
      expect(content).toContain('## The proposal');
      const headings = [
        '**Suggested automation**',
        '**Unit**',
        '**Carries**',
        '**Found and refreshed**',
        '**Evidence**',
        '**Cost**',
        '**Example questions**',
      ];
      const positions = headings.map((heading) => content.indexOf(heading));
      expect(positions.every((position) => position > 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      expect(content).toMatch(/\*\*Evidence\*\* — required/);
      expect(content).toMatch(/\*\*Cost\*\* — required/);
      expect(content).toMatch(/\*\*Example questions\*\* — optional/);
    });

    it('lets example questions in only when the fields they rest on were seen populated', () => {
      expect(content).toMatch(/only if an access pattern the KI will carry answers it/);
      expect(content).toMatch(
        /was non-null in the sampled rows or had a probe count above zero\. Do not run extra\s+queries to qualify a question/
      );
      expect(content).toMatch(/When no question meets that bar, omit the section/);
    });

    it('warns that COUNT on an array field counts values, not rows', () => {
      expect(content).toMatch(/on an array field `populated` counts values rather than rows/);
    });

    it('has the cost section carry the pilot time estimate once a pilot has run, and no guess before', () => {
      expect(content).toMatch(/the pilot's duration and the projected duration of a full run/);
      expect(content).toMatch(
        /Before the pilot, say the time is not yet measured rather than\s+guessing/
      );
    });

    it('sends the setup case through the grounding queries, with the evidence in the proposal', () => {
      expect(content).toMatch(
        /then the sampling queries, join probes and unit count from "Ground the proposal in the data"/
      );
      expect(content).toMatch(
        /with the Evidence section carrying the counts that shape was read from/
      );
    });

    it('quotes evidence as populated-of-total lines, the way the trace findings do', () => {
      expect(content).toMatch(/0 of 31,901 populated/);
    });

    it('carries no human-in-the-loop choreography, which belongs to the invoking run', () => {
      expect(content).not.toContain('ask_user_question');
      expect(content).not.toContain('save_automation');
    });

    it('does not restate the signal mechanics it delegates', () => {
      // The field table, the ES|QL idioms and the traces join live in `context-engine-signals`.
      // Two copies drift, and a stale one here is worse than none.
      expect(content).not.toContain('field_extract(data, ');
      expect(content).not.toContain('MV_CONTAINS(tags,');
      expect(content).not.toContain('traces-agent_builder.otel-');
    });

    it('does not restate the workflow authoring mechanics it delegates', () => {
      expect(content).not.toContain('context-engine.verifyKi');
      expect(content).not.toContain('validate_workflow');
    });

    it('still names the three tags, which the reasoning about findings is written in', () => {
      expect(content).toContain('query_error');
      expect(content).toContain('empty_retrieval');
      expect(content).toContain('coverage_gap');
    });

    it('warns that signals never establish what the index holds', () => {
      expect(content).toMatch(/Signals say what agents asked for, never what the index holds/);
    });

    it('allows proposing nothing when the evidence is thin', () => {
      expect(content).toContain('When to propose nothing');
    });

    it('does not read an absence of signals as evidence of health', () => {
      expect(content).toContain('No signals, on an index that exists');
    });

    it('warns against re-proposing rejected improvements', () => {
      expect(content).toContain('already rejected');
    });

    it('sends the run to look history up, rather than waiting to be handed it', () => {
      expect(content).toContain('context-engine-improvements');
      expect(content).toMatch(/target\.ki_id.*target\.workflow_id.*target\.subject/s);
      expect(content).toContain('resolution.reason');
    });

    it('defers the lookup until there is a target to look up', () => {
      // Which history matters depends on what the run decides to propose, so a lookup made before
      // that is a guess at what will turn out to be relevant.
      expect(content).toMatch(/when you know what you want to change, not before/);
    });

    it('names the missing index as an answer, not a failure', () => {
      // The index is created by the first write, so an empty deployment errors rather than
      // returning nothing — which reads as a broken lookup unless the skill says otherwise.
      expect(content).toMatch(/Unknown index.*means nothing has ever been proposed/s);
    });
  });

  describe('ki_shapes reference', () => {
    const shapes = kiShapesReference.content;

    it('lists no self-reported quality attribute', () => {
      for (const attribute of ['confidence', 'coverage', 'evidence']) {
        expect(shapes).not.toMatch(new RegExp(`\\| \`attributes\\.${attribute}\``));
      }
      expect(shapes).toMatch(/No KI carries a self-reported quality number/);
      expect(shapes).toMatch(/Do not add `confidence`, `coverage` or `evidence` attributes/);
    });

    it('keeps the domain attributes the retrieval prompt needs, each tied to the template that writes it', () => {
      for (const attribute of ['esql', 'unit_key', 'unit', 'prevalence', 'error_text']) {
        expect(shapes).toMatch(new RegExp(`\\| \`attributes\\.${attribute}\``));
      }
      expect(shapes).toMatch(/\| `attributes\.unit_key` \|[^|]*\| `unit-profile-template` \|/);
      expect(shapes).toMatch(/\| `attributes\.prevalence` \|[^|]*\| `targeted-ki-writer` \|/);
    });

    it('lists no unit attribute that only a freshness check read', () => {
      expect(shapes).not.toMatch(/source_fingerprint|source_updated_at|freshness/);
    });

    it('casts an attribute a template actually writes in its ES|QL example', () => {
      expect(shapes).toContain('FIELD_EXTRACT(attributes, "doc_count")');
      expect(shapes).not.toContain('FIELD_EXTRACT(attributes, "coverage")');
      expect(shapes).not.toContain('FIELD_EXTRACT(attributes, "expires_at")');
    });

    const baseFieldRow = (field: string): string | undefined =>
      shapes.split('\n').find((line) => line.startsWith(`| \`${field}\` |`));

    it('lists references and expires_at as top-level fields the workflow writes', () => {
      expect(baseFieldRow('references')).toMatch(/derived_from/);
      expect(baseFieldRow('expires_at')).toMatch(/Omitted for durable/);
      expect(shapes).not.toContain('attributes.expires_at');
    });

    it('marks the fields the steps stamp as never supplied in the step input', () => {
      for (const field of ['id', 'updated_at', 'governance', '@timestamp']) {
        expect({ field, row: baseFieldRow(field) }).toEqual({
          field,
          row: expect.stringMatching(/never supplied in the step input/),
        });
      }
    });

    it('documents provenance as references in four URI schemes, not as attributes', () => {
      for (const scheme of [
        'index://<index>',
        'doc://<index>/<_id>',
        'trace://<trace_id>',
        'conversation://<conversation_id>',
      ]) {
        expect(shapes).toContain(`\`${scheme}\``);
      }
      for (const attribute of ['source_index', 'source_doc_id', 'trace_ids', 'conversation_id']) {
        expect(shapes).not.toMatch(new RegExp(`\\| \`attributes\\.${attribute}\``));
      }
      // Who wrote the KI is the step's job, so no workflow:// reference is ever written.
      expect(shapes).toMatch(/never add a `workflow:\/\/`\s+reference/);
    });

    it('explains revisions on a data stream and how to read the current state', () => {
      expect(shapes).not.toMatch(/`ki_id` is\s+rejected/);
      expect(shapes).toMatch(/writing the same `ki_id` overwrites it/);
      expect(shapes).toMatch(/adds a new\s+document \(a revision\) carrying the same `id`/);
      expect(shapes).toMatch(/newest document per `id`/);
      expect(shapes).toMatch(/`governance\.lifecycle\.status` is `deleted`/);
      expect(shapes).toContain('platform.context_engine.query_ai_indices');
    });

    it('makes attributes.esql optional for a KI with no runnable query, never an empty list', () => {
      const esqlRow = shapes.split('\n').find((line) => line.startsWith('| `attributes.esql` |'));

      expect(esqlRow).toContain('a KI with no runnable query omits it');
      expect(esqlRow).toContain('the verifiers skip it. Never an empty list.');
      expect(esqlRow).toMatch(/\| every template, when the KI has a query \|$/);
    });
  });

  it('puts a targeted KI provenance in references, per ki_shapes', () => {
    const { content } = analyzeAndImproveSkill;

    expect(content).not.toMatch(/Put them in `attributes` as `ki_shapes` lays out/);
    expect(content).toMatch(
      /They become the KI's `references`, in the URI schemes `ki_shapes` lays out/
    );
    expect(content).not.toMatch(/provenance fields inside `attributes`/);
  });

  it('allows a KI that only orients when the unit has no meaningful query', () => {
    const { content } = analyzeAndImproveSkill;

    expect(content).toMatch(
      /Both halves earn their place\. The exception is\s+a unit with no meaningful query/
    );
    expect(content).toMatch(
      /omits `attributes\.esql` rather than carrying a query that answers nothing/
    );
  });
});
