/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { InvestigationState } from '@kbn/significant-events-schema';
import type { InvestigationStatus } from './types';

type Header =
  | { spinner: true; title: string }
  | { spinner: false; icon: string; color: 'success' | 'danger' | 'warning'; title: string };

const buildRunningHeadline = (state: InvestigationState | undefined): string => {
  const hypotheses = state?.hypotheses ?? [];
  if (hypotheses.length === 0) {
    return i18n.translate('xpack.investigationOutput.gatheringEvidenceTitle', {
      defaultMessage: 'Gathering evidence',
    });
  }
  const hasInvestigating = hypotheses.some((h) => h.status === 'investigating');
  if (hasInvestigating) {
    return i18n.translate('xpack.investigationOutput.evaluatingHypothesesTitle', {
      defaultMessage: 'Evaluating {count} {count, plural, one {hypothesis} other {hypotheses}}',
      values: { count: hypotheses.length },
    });
  }
  return i18n.translate('xpack.investigationOutput.concludingTitle', {
    defaultMessage: 'Concluding',
  });
};

export const buildHeader = (status: InvestigationStatus, state?: InvestigationState): Header => {
  switch (status) {
    case 'running':
      return { spinner: true, title: buildRunningHeadline(state) };
    case 'loading':
      return {
        spinner: true,
        title: i18n.translate('xpack.investigationOutput.loadingResultTitle', {
          defaultMessage: 'Loading investigation result…',
        }),
      };
    case 'failed':
      return {
        spinner: false,
        icon: 'errorFilled',
        color: 'danger',
        title: i18n.translate('xpack.investigationOutput.failedStatusTitle', {
          defaultMessage: 'Investigation failed',
        }),
      };
    case 'unavailable':
      return {
        spinner: false,
        icon: 'warning',
        color: 'warning',
        title: i18n.translate('xpack.investigationOutput.unavailableStatusTitle', {
          defaultMessage: 'Investigation result unavailable',
        }),
      };
    case 'complete':
      return {
        spinner: false,
        icon: 'checkInCircleFilled',
        color: 'success',
        title: i18n.translate('xpack.investigationOutput.successStatusTitle', {
          defaultMessage: 'Investigation complete',
        }),
      };
  }
};

/** Builds the markdown shown for the final result: the agent's own `conclusion` markdown
 * (already containing its own `## Conclusion` / `## Next Steps` sections), followed by a
 * `## Gaps Found` section when the agent reported any. */
export const buildFinalResultsMarkdown = (state: InvestigationState): string | undefined => {
  const sections: string[] = [];

  if (state.conclusion) {
    sections.push(state.conclusion);
  }

  if (state.gaps_found && state.gaps_found.length > 0) {
    const gapsTitle = i18n.translate('xpack.investigationOutput.gapsFoundTitle', {
      defaultMessage: 'Gaps found',
    });
    sections.push([`## ${gapsTitle}`, ...state.gaps_found.map((gap) => `- ${gap}`)].join('\n'));
  }

  return sections.length > 0 ? sections.join('\n\n') : undefined;
};
