/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/**
 * The set of Index Lifecycle Management (ILM) phases.
 */
export type IlmPhase = 'hot' | 'warm' | 'cold' | 'frozen' | 'delete';

/**
 * Canonical phase order.
 */
export const PHASE_ORDER: IlmPhase[] = ['hot', 'warm', 'cold', 'frozen', 'delete'];

/**
 * Short phase labels ("Hot", "Warm", …). Used in badges and summaries.
 */
export const PHASE_NAMES: Record<IlmPhase, string> = {
  hot: i18n.translate('xpack.dataLifecyclePhases.phaseNameHot', {
    defaultMessage: 'Hot',
  }),
  warm: i18n.translate('xpack.dataLifecyclePhases.phaseNameWarm', {
    defaultMessage: 'Warm',
  }),
  cold: i18n.translate('xpack.dataLifecyclePhases.phaseNameCold', {
    defaultMessage: 'Cold',
  }),
  frozen: i18n.translate('xpack.dataLifecyclePhases.phaseNameFrozen', {
    defaultMessage: 'Frozen',
  }),
  delete: i18n.translate('xpack.dataLifecyclePhases.phaseNameDelete', {
    defaultMessage: 'Delete',
  }),
};

/**
 * Full phase labels ("Hot phase", "Warm phase", …). Used in selects and the policy editor.
 */
export const PHASE_TITLES: Record<IlmPhase, string> = {
  hot: i18n.translate('xpack.dataLifecyclePhases.phaseTitleHot', {
    defaultMessage: 'Hot phase',
  }),
  warm: i18n.translate('xpack.dataLifecyclePhases.phaseTitleWarm', {
    defaultMessage: 'Warm phase',
  }),
  cold: i18n.translate('xpack.dataLifecyclePhases.phaseTitleCold', {
    defaultMessage: 'Cold phase',
  }),
  frozen: i18n.translate('xpack.dataLifecyclePhases.phaseTitleFrozen', {
    defaultMessage: 'Frozen phase',
  }),
  delete: i18n.translate('xpack.dataLifecyclePhases.phaseTitleDelete', {
    defaultMessage: 'Delete phase',
  }),
};

/**
 * Short descriptions (one sentence). Used in the Streams app phase selector.
 */
export const PHASE_DESCRIPTIONS: Record<IlmPhase, string> = {
  hot: i18n.translate('xpack.dataLifecyclePhases.phaseShortDescriptionHot', {
    defaultMessage:
      'Use for data that is searched frequently and actively updated, optimized for indexing and search performance.',
  }),
  warm: i18n.translate('xpack.dataLifecyclePhases.phaseShortDescriptionWarm', {
    defaultMessage:
      'Use for data that is searched occasionally but rarely updated, optimized for search over indexing.',
  }),
  cold: i18n.translate('xpack.dataLifecyclePhases.phaseShortDescriptionCold', {
    defaultMessage:
      'Use for infrequently searched, read-only data where cost savings are prioritized over performance.',
  }),
  frozen: i18n.translate('xpack.dataLifecyclePhases.phaseShortDescriptionFrozen', {
    defaultMessage: 'Use for long-term retention of searchable data at the lowest possible cost.',
  }),
  delete: i18n.translate('xpack.dataLifecyclePhases.phaseShortDescriptionDelete', {
    defaultMessage: 'Use to delete your data once it has reached a specified age.',
  }),
};

/**
 * Long descriptions. Used in the ILM policy editor.
 */
export const PHASE_LONG_DESCRIPTIONS: Record<IlmPhase, string> = {
  hot: i18n.translate('xpack.dataLifecyclePhases.phaseDescriptionHot', {
    defaultMessage:
      'Store your most recent, most frequently-searched data in the hot tier. The hot tier provides the best indexing and search performance by using the most powerful, expensive hardware.',
  }),
  warm: i18n.translate('xpack.dataLifecyclePhases.phaseDescriptionWarm', {
    defaultMessage:
      'Move data to the warm tier when you are still likely to search it, but infrequently need to update it. The warm tier is optimized for search performance over indexing performance.',
  }),
  cold: i18n.translate('xpack.dataLifecyclePhases.phaseDescriptionCold', {
    defaultMessage:
      "Move data to the cold tier when you are searching it less often and don't need to update it. The cold tier is optimized for cost savings over search performance.",
  }),
  frozen: i18n.translate('xpack.dataLifecyclePhases.phaseDescriptionFrozen', {
    defaultMessage:
      'Move data to the frozen tier for long term retention. The frozen tier provides the most cost-effective way store your data and still be able to search it.',
  }),
  delete: i18n.translate('xpack.dataLifecyclePhases.phaseDescriptionDelete', {
    defaultMessage: 'Delete data you no longer need.',
  }),
};

export type PhaseColorMap = Record<IlmPhase, string>;

/**
 * Hook that resolves EUI-theme-aware colors for each data lifecycle phase.
 */
export const usePhaseColors = (): PhaseColorMap => {
  const { euiTheme } = useEuiTheme();

  return {
    hot: euiTheme.colors.severity.risk,
    warm: euiTheme.colors.severity.warning,
    cold: euiTheme.colors.severity.neutral,
    frozen: euiTheme.colors.vis.euiColorVis3,
    delete: euiTheme.colors.backgroundBaseSubdued,
  };
};
