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
      `${internalNamespaces.workflows}.get_workflow`,
    ]);
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

    it('uses one calibrated confidence scale for both KIs and findings', () => {
      expect(content).toContain('attributes.confidence');
      expect(content).toMatch(/0\.9–1\.0/);
      expect(content).toContain('Do not emit');
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
});
