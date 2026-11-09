/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolveMlCapabilities } from '@kbn/ml-common-types/capabilities';
import {
  AGENT_BUILDER_BUILTIN_ATTACHMENTS,
  AGENT_BUILDER_BUILTIN_SKILLS,
  AGENT_BUILDER_BUILTIN_TOOLS,
} from '@kbn/agent-builder-server/allow_lists';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { DFA_TOOL_IDS } from '../../tools/tool_ids';
import { createDataFrameAnalyticsSkill } from '.';

const mockResolveMlCapabilities = jest.fn() as ResolveMlCapabilities;

describe('createDataFrameAnalyticsSkill', () => {
  const skill = createDataFrameAnalyticsSkill({
    resolveMlCapabilities: mockResolveMlCapabilities,
  });

  it('returns a skill definition with the correct id and name', () => {
    expect(skill.id).toBe('ml.data-frame-analytics');
    expect(skill.name).toBe('data-frame-analytics');
  });

  it('is marked experimental', () => {
    expect(skill.experimental).toBe(true);
  });

  it('uses the data_frame_analytics base path', () => {
    expect(skill.basePath).toBe('skills/ml/data_frame_analytics');
  });

  it('has a non-empty description within the 1024 character limit', () => {
    expect(skill.description).toBeTruthy();
    expect(skill.description.length).toBeLessThanOrEqual(1024);
  });

  it('keeps the main skill under 20KB and moves recipes to references', () => {
    expect(skill.content.length).toBeGreaterThan(0);
    expect(skill.content.length).toBeLessThan(20 * 1024);
  });

  it('registers execute_esql and create_visualization', async () => {
    const toolIds = await skill.getRegistryTools?.();
    expect(toolIds).toEqual([platformCoreTools.executeEsql, platformCoreTools.createVisualization]);
  });

  it('exposes the six data frame analytics tools inline', async () => {
    const tools = await skill.getInlineTools?.();
    expect(tools?.map((tool) => tool.id)).toEqual([...DFA_TOOL_IDS]);
  });

  it('ships referenced guidance without an MV_EXPAND recipe', () => {
    expect(skill.referencedContent).toHaveLength(6);
    const names = skill.referencedContent!.map((reference) => reference.name);
    expect(names).toEqual([
      'choose-analysis',
      'create-job',
      'interpret-results',
      'troubleshoot',
      'esql-result-queries',
      'job-recipes',
    ]);
    const combined = [
      skill.content,
      ...skill.referencedContent!.map((reference) => reference.content),
    ].join('\n');
    expect(combined).not.toMatch(/MV_EXPAND/);
    expect(combined).toContain('every document in it');
    expect(combined).toContain('Unknown column');
    expect(skill.content).toContain('80');
    expect(skill.content).toContain('200000');
    expect(skill.content).toContain('ask only business questions');
    expect(combined).toContain('Never ask the user to choose the analysis name');
    expect(combined).toContain('100000');
    expect(combined).toContain('outlier_fraction');
    expect(combined).toContain('0.25');
    expect(combined).toContain('chart_attachment.render');
    expect(combined).toContain('scatterplot_attachment.render');
    expect(combined).not.toContain('confusion_matrix_attachment');
    expect(combined).toContain('platform.core.create_visualization');
    expect(combined).toContain('Actual vs Predicted');
    expect(combined).toContain('false positive');
    expect(combined).toContain('false negative');
    expect(combined).toContain('green for correct');
    expect(combined).toContain('Display counts prominently');
    expect(combined).toContain('custom_content');
    expect(combined).not.toContain('Normalized confusion matrix');
    expect(combined).toContain('Do not call `attachments.read`');
    expect(combined).toContain('Do not build another feature importance chart');
    for (const reference of skill.referencedContent!) {
      expect(reference.relativePath).toBe('./references');
      expect(reference.content).toBeTruthy();
    }
  });

  it('allow list contains the skill and every data frame analytics tool id', () => {
    expect(AGENT_BUILDER_BUILTIN_SKILLS).toContain(skill.id);
    for (const toolId of DFA_TOOL_IDS) {
      expect(AGENT_BUILDER_BUILTIN_TOOLS).toContain(toolId);
    }
    expect(AGENT_BUILDER_BUILTIN_ATTACHMENTS).toContain('ml.dfa_total_feature_importance');
    expect(AGENT_BUILDER_BUILTIN_ATTACHMENTS).toContain('ml.dfa_scatterplot_matrix');
    expect(AGENT_BUILDER_BUILTIN_ATTACHMENTS).not.toContain('ml.dfa_confusion_matrix');
  });
});
