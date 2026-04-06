/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Skill Versioning System
 *
 * Tracks skill evolution over time:
 * - Version history (v1, v2, v3, ...)
 * - Diff between versions
 * - Rollback capability
 * - Performance metrics per version
 *
 * Storage: .aesop-skill-versions index
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export interface SkillVersion {
  skill_id: string;
  skill_name: string;
  version: number;
  markdown: string;
  tools: string[];
  confidence: number;

  // What changed
  changes_from_previous?: {
    markdown_diff?: string;
    tools_added?: string[];
    tools_removed?: string[];
    improvement_rationale?: string;
  };

  // Performance metrics
  metrics?: {
    eval_score: number;
    avg_tokens: number;
    avg_latency_ms: number;
    error_rate?: number;
  };

  // Metadata
  created_at: string;
  created_by: 'aesop' | 'human';
  source_iteration?: number; // Which validation iteration produced this
  parent_version?: number; // Previous version
  is_deployed: boolean;
  agent_builder_skill_id?: string;
}

export class SkillVersioningService {
  constructor(private readonly esClient: ElasticsearchClient) {}

  /**
   * Creates initial version (v1) when skill is first proposed
   */
  async createInitialVersion(skillId: string, skillData: any): Promise<SkillVersion> {
    const version: SkillVersion = {
      skill_id: skillId,
      skill_name: skillData.name,
      version: 1,
      markdown: skillData.markdown,
      tools: skillData.tools || [],
      confidence: skillData.confidence,
      created_at: new Date().toISOString(),
      created_by: 'aesop',
      is_deployed: false,
    };

    await this.esClient.index({
      index: '.aesop-skill-versions',
      id: `${skillId}-v1`,
      document: version,
      refresh: 'wait_for',
    });

    return version;
  }

  /**
   * Creates new version after skill improvement
   */
  async createNewVersion(
    skillId: string,
    improvedMarkdown: string,
    improvementRationale: string,
    sourceIteration: number,
    metrics?: {
      eval_score: number;
      avg_tokens: number;
      avg_latency_ms: number;
    }
  ): Promise<SkillVersion> {
    // Get latest version
    const latestVersion = await this.getLatestVersion(skillId);

    const newVersionNumber = latestVersion.version + 1;

    // Compute diff
    const markdownDiff = this.computeDiff(latestVersion.markdown, improvedMarkdown);

    const newVersion: SkillVersion = {
      skill_id: skillId,
      skill_name: latestVersion.skill_name,
      version: newVersionNumber,
      markdown: improvedMarkdown,
      tools: latestVersion.tools, // Tools rarely change
      confidence: latestVersion.confidence * 0.98, // Slight decay per iteration
      changes_from_previous: {
        markdown_diff: markdownDiff,
        improvement_rationale: improvementRationale,
      },
      metrics,
      created_at: new Date().toISOString(),
      created_by: 'aesop',
      source_iteration: sourceIteration,
      parent_version: latestVersion.version,
      is_deployed: false,
    };

    await this.esClient.index({
      index: '.aesop-skill-versions',
      id: `${skillId}-v${newVersionNumber}`,
      document: newVersion,
      refresh: 'wait_for',
    });

    // Update current skill pointer
    await this.esClient.update({
      index: '.aesop-proposed-skills',
      id: skillId,
      doc: {
        markdown: improvedMarkdown,
        current_version: newVersionNumber,
        version_history: {
          total_versions: newVersionNumber,
          latest_version_id: `${skillId}-v${newVersionNumber}`,
        },
      },
    });

    return newVersion;
  }

  /**
   * Gets latest version of a skill
   */
  async getLatestVersion(skillId: string): Promise<SkillVersion> {
    const result = await this.esClient.search({
      index: '.aesop-skill-versions',
      query: {
        term: { skill_id: skillId },
      },
      sort: [{ version: { order: 'desc' } }],
      size: 1,
    });

    const total = result.hits.total;
    const totalValue = typeof total === 'number' ? total : total?.value ?? 0;
    if (totalValue === 0) {
      throw new Error(`No versions found for skill ${skillId}`);
    }

    return result.hits.hits[0]._source as SkillVersion;
  }

  /**
   * Gets all versions of a skill (for version history view)
   */
  async getVersionHistory(skillId: string): Promise<SkillVersion[]> {
    const result = await this.esClient.search({
      index: '.aesop-skill-versions',
      query: {
        term: { skill_id: skillId },
      },
      sort: [{ version: { order: 'asc' } }],
      size: 100,
    });

    return result.hits.hits.map((hit) => hit._source as SkillVersion);
  }

  /**
   * Rollback to previous version
   */
  async rollbackToVersion(skillId: string, targetVersion: number): Promise<SkillVersion> {
    // Get target version
    const versionDoc = await this.esClient.get({
      index: '.aesop-skill-versions',
      id: `${skillId}-v${targetVersion}`,
    });

    const targetVersionData = versionDoc._source as SkillVersion;

    // Update current skill to use target version's content
    await this.esClient.update({
      index: '.aesop-proposed-skills',
      id: skillId,
      doc: {
        markdown: targetVersionData.markdown,
        tools: targetVersionData.tools,
        confidence: targetVersionData.confidence,
        current_version: targetVersion,
        rollback_metadata: {
          rolled_back_at: new Date().toISOString(),
          rolled_back_from: await this.getLatestVersion(skillId).then((v) => v.version),
          rolled_back_to: targetVersion,
        },
      },
    });

    return targetVersionData;
  }

  /**
   * Compares two versions and returns diff
   */
  async compareVersions(
    skillId: string,
    version1: number,
    version2: number
  ): Promise<{
    version1: SkillVersion;
    version2: SkillVersion;
    diff: string;
    metrics_comparison?: {
      eval_score_delta: number;
      tokens_delta: number;
      latency_delta: number;
    };
  }> {
    const [v1Doc, v2Doc] = await Promise.all([
      this.esClient.get({
        index: '.aesop-skill-versions',
        id: `${skillId}-v${version1}`,
      }),
      this.esClient.get({
        index: '.aesop-skill-versions',
        id: `${skillId}-v${version2}`,
      }),
    ]);

    const v1 = v1Doc._source as SkillVersion;
    const v2 = v2Doc._source as SkillVersion;

    const diff = this.computeDiff(v1.markdown, v2.markdown);

    const metricsComparison =
      v1.metrics && v2.metrics
        ? {
            eval_score_delta: v2.metrics.eval_score - v1.metrics.eval_score,
            tokens_delta: v2.metrics.avg_tokens - v1.metrics.avg_tokens,
            latency_delta: v2.metrics.avg_latency_ms - v1.metrics.avg_latency_ms,
          }
        : undefined;

    return {
      version1: v1,
      version2: v2,
      diff,
      metrics_comparison: metricsComparison,
    };
  }

  /**
   * Simple diff computation (line-based)
   */
  private computeDiff(oldContent: string, newContent: string): string {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    const diff: string[] = [];

    // Very simple diff (production would use proper diff library)
    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine !== newLine) {
        if (oldLine) {
          diff.push(`- ${oldLine}`);
        }
        if (newLine) {
          diff.push(`+ ${newLine}`);
        }
      }
    }

    return diff.join('\n');
  }
}

/**
 * Initialize skill versioning index
 */
export async function initializeSkillVersioningIndex(esClient: ElasticsearchClient) {
  try {
    await esClient.indices.create({
      index: '.aesop-skill-versions',
      mappings: {
        properties: {
          skill_id: { type: 'keyword' },
          skill_name: { type: 'text' },
          version: { type: 'integer' },
          markdown: { type: 'text' },
          tools: { type: 'keyword' },
          confidence: { type: 'float' },
          changes_from_previous: {
            properties: {
              markdown_diff: { type: 'text' },
              tools_added: { type: 'keyword' },
              tools_removed: { type: 'keyword' },
              improvement_rationale: { type: 'text' },
            },
          },
          metrics: {
            properties: {
              eval_score: { type: 'float' },
              avg_tokens: { type: 'float' },
              avg_latency_ms: { type: 'float' },
              error_rate: { type: 'float' },
            },
          },
          created_at: { type: 'date' },
          created_by: { type: 'keyword' },
          source_iteration: { type: 'integer' },
          parent_version: { type: 'integer' },
          is_deployed: { type: 'boolean' },
          agent_builder_skill_id: { type: 'keyword' },
        },
      },
    });
  } catch (error) {
    // Ignore if already exists
    const errMsg = error instanceof Error ? error.message : String(error);
    if (!errMsg.includes('already exists')) {
      throw error;
    }
  }
}
