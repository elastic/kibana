/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentPanel,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { getLeafPanels, getPanelKind } from '../dashboard_panels';
import { getRuleScope, type DashboardRuleId } from './dashboard_rules';
import type { RuleScope, RuleViolation } from './rule_model';

/**
 * Enhance defects that can only be judged against the seed: whether the agent
 * changed something the guidance says it must rewrite. A single dashboard
 * cannot show them, so they live outside the rule registry.
 */
export type SeedDefectId = 'markdown_not_rewritten' | 'title_not_rewritten';

export type EnhanceDefectId = DashboardRuleId | SeedDefectId;

interface SeedDefect {
  scope: RuleScope;
  /** True when the seed has something this defect can apply to. */
  appliesToSeed: (seed: DashboardAttachmentData) => boolean;
  /** Violations still present in the result. */
  remaining: (
    seed: DashboardAttachmentData,
    result: DashboardAttachmentData
  ) => Array<RuleViolation<SeedDefectId>>;
}

const getMarkdownContent = (dashboard: DashboardAttachmentData): Map<string, string> =>
  new Map(
    getLeafPanels(dashboard)
      .filter((panel: AttachmentPanel) => getPanelKind(panel) === 'markdown')
      .map(({ id, config }) => [
        id,
        typeof config.content === 'string' ? config.content.trim() : '',
      ])
  );

const normalizeTitle = (title: string): string => title.trim().toLowerCase();

const SEED_DEFECTS: Record<SeedDefectId, SeedDefect> = {
  // The dashboard title is rewritten from what the queries measure, not kept
  // or recapitalized from the seed.
  title_not_rewritten: {
    scope: 'appearance',
    appliesToSeed: () => true,
    remaining: (seed, result) =>
      normalizeTitle(seed.title) === normalizeTitle(result.title)
        ? [
            {
              rule: 'title_not_rewritten' as const,
              panelIds: [],
              detail: `title "${result.title}" is the seeded title`,
              path: 'title',
            },
          ]
        : [],
  },
  // Existing markdown is unverified copy: enhance rewrites it from what the
  // queries measure, or deletes it. A seeded panel kept with the same text was
  // neither.
  markdown_not_rewritten: {
    scope: 'appearance',
    appliesToSeed: (seed) => getMarkdownContent(seed).size > 0,
    remaining: (seed, result) => {
      const resultContent = getMarkdownContent(result);
      return [...getMarkdownContent(seed)]
        .filter(([id, content]) => resultContent.get(id) === content)
        .map(([id]) => ({
          rule: 'markdown_not_rewritten' as const,
          panelIds: [id],
          detail: `markdown ${id} still has the seeded text`,
          path: 'content',
        }));
    },
  },
};

export const isSeedDefect = (defect: EnhanceDefectId): defect is SeedDefectId =>
  defect in SEED_DEFECTS;

export const getDefectScope = (defect: EnhanceDefectId): RuleScope =>
  isSeedDefect(defect) ? SEED_DEFECTS[defect].scope : getRuleScope(defect);

export const seedDefectAppliesTo = (defect: SeedDefectId, seed: DashboardAttachmentData): boolean =>
  SEED_DEFECTS[defect].appliesToSeed(seed);

export const findRemainingSeedDefects = (
  defects: readonly SeedDefectId[],
  seed: DashboardAttachmentData,
  result: DashboardAttachmentData
): Array<RuleViolation<SeedDefectId>> =>
  defects.flatMap((defect) => SEED_DEFECTS[defect].remaining(seed, result));
