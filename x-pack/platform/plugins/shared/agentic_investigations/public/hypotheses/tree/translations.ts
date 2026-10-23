/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ProposalConfidence } from '@kbn/proposals-common';
import type { HypothesisStatus } from '../../../common/hypotheses/hypotheses';
import { HYPOTHESIS_STATUS_LABELS } from '../attachments/translations';

export const HYPOTHESIS_TREE_TITLE = i18n.translate(
  'xpack.agenticInvestigations.hypothesisTree.title',
  {
    defaultMessage: 'Hypothesis tree',
  }
);

export const OPEN_HYPOTHESIS_TREE_LABEL = i18n.translate(
  'xpack.agenticInvestigations.hypothesisTree.card.title',
  {
    defaultMessage: 'View hypothesis tree',
  }
);

export const hypothesesAnalyzedLabel = (count: number): string =>
  i18n.translate('xpack.agenticInvestigations.hypothesisTree.card.description', {
    defaultMessage: '{count, plural, one {# hypothesis analyzed} other {# hypotheses analyzed}}',
    values: { count },
  });

export const openHypothesisTreeAriaLabel = (description: string): string =>
  i18n.translate('xpack.agenticInvestigations.hypothesisTree.card.ariaLabel', {
    defaultMessage: 'Open the hypothesis tree: {description}',
    values: { description },
  });

export const NODE_LABELS = {
  trigger: i18n.translate('xpack.agenticInvestigations.hypothesisTree.node.trigger', {
    defaultMessage: 'Trigger',
  }),
  hypothesis: i18n.translate('xpack.agenticInvestigations.hypothesisTree.node.hypothesis', {
    defaultMessage: 'Hypothesis',
  }),
  conclusion: i18n.translate('xpack.agenticInvestigations.hypothesisTree.node.conclusion', {
    defaultMessage: 'Conclusion',
  }),
  proposedAction: i18n.translate('xpack.agenticInvestigations.hypothesisTree.node.proposedAction', {
    defaultMessage: 'Proposed action',
  }),
};

export const hypothesesCountLabel = (count: number): string =>
  i18n.translate('xpack.agenticInvestigations.hypothesisTree.node.hypothesesCount', {
    defaultMessage: '{count, plural, one {# hypothesis} other {# hypotheses}}',
    values: { count },
  });

export const actionsCountLabel = (count: number): string =>
  i18n.translate('xpack.agenticInvestigations.hypothesisTree.node.actionsCount', {
    defaultMessage: '{count, plural, one {# proposed action} other {# proposed actions}}',
    values: { count },
  });

export const moreSubjectsLabel = (count: number): string =>
  i18n.translate('xpack.agenticInvestigations.hypothesisTree.node.moreSubjects', {
    defaultMessage: '+{count} more',
    values: { count },
  });

export const hypothesisStatusCountLabel = (status: HypothesisStatus, count: number): string =>
  i18n.translate('xpack.agenticInvestigations.hypothesisTree.statusCount', {
    defaultMessage: '{count} {status}',
    values: { count, status: HYPOTHESIS_STATUS_LABELS[status] },
  });

export const PROPOSAL_CONFIDENCE_LABELS: Record<ProposalConfidence, string> = {
  high: i18n.translate('xpack.agenticInvestigations.hypothesisTree.proposalConfidence.high', {
    defaultMessage: 'High confidence',
  }),
  medium: i18n.translate('xpack.agenticInvestigations.hypothesisTree.proposalConfidence.medium', {
    defaultMessage: 'Medium confidence',
  }),
  low: i18n.translate('xpack.agenticInvestigations.hypothesisTree.proposalConfidence.low', {
    defaultMessage: 'Low confidence',
  }),
};

export const CLOSE_DETAILS_LABEL = i18n.translate(
  'xpack.agenticInvestigations.hypothesisTree.detail.close',
  {
    defaultMessage: 'Close details',
  }
);

export const FIT_VIEW_LABEL = i18n.translate('xpack.agenticInvestigations.hypothesisTree.fitView', {
  defaultMessage: 'Fit to view',
});
export const INVESTIGATING_LABEL = i18n.translate(
  'xpack.agenticInvestigations.hypothesisTree.investigating',
  {
    defaultMessage: 'Investigating…',
  }
);

export const VIEW_ALERT_LABEL = i18n.translate(
  'xpack.agenticInvestigations.hypothesisTree.node.viewAlert',
  { defaultMessage: 'View alert' }
);
export const OPEN_SLACK_THREAD_LABEL = i18n.translate(
  'xpack.agenticInvestigations.hypothesisTree.node.openSlackThread',
  { defaultMessage: 'Open in Slack' }
);
