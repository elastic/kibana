/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ProposalConfidence, ProposalStatus } from '@kbn/proposals-common';
import type { HypothesisStatus } from '../../../common/hypotheses/hypotheses';

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

export const hypothesisConfidenceLabel = (confidence: number): string =>
  i18n.translate('xpack.agenticInvestigations.hypothesisTree.hypothesisConfidence', {
    defaultMessage: 'Confidence {confidence, number, percent}',
    values: { confidence },
  });

export const HYPOTHESIS_STATUS_LABELS: Record<HypothesisStatus, string> = {
  confirmed: i18n.translate('xpack.agenticInvestigations.hypothesisTree.status.confirmed', {
    defaultMessage: 'Confirmed',
  }),
  dismissed: i18n.translate('xpack.agenticInvestigations.hypothesisTree.status.dismissed', {
    defaultMessage: 'Dismissed',
  }),
  investigating: i18n.translate('xpack.agenticInvestigations.hypothesisTree.status.investigating', {
    defaultMessage: 'Investigating',
  }),
};

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

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  pending: i18n.translate('xpack.agenticInvestigations.hypothesisTree.proposalStatus.pending', {
    defaultMessage: 'Awaiting decision',
  }),
  executing: i18n.translate('xpack.agenticInvestigations.hypothesisTree.proposalStatus.executing', {
    defaultMessage: 'Running',
  }),
  succeeded: i18n.translate('xpack.agenticInvestigations.hypothesisTree.proposalStatus.succeeded', {
    defaultMessage: 'Applied',
  }),
  failed: i18n.translate('xpack.agenticInvestigations.hypothesisTree.proposalStatus.failed', {
    defaultMessage: 'Failed',
  }),
  expired: i18n.translate('xpack.agenticInvestigations.hypothesisTree.proposalStatus.expired', {
    defaultMessage: 'Expired',
  }),
  no_action: i18n.translate('xpack.agenticInvestigations.hypothesisTree.proposalStatus.noAction', {
    defaultMessage: 'Dismissed',
  }),
  superseded: i18n.translate(
    'xpack.agenticInvestigations.hypothesisTree.proposalStatus.superseded',
    {
      defaultMessage: 'Superseded',
    }
  ),
};

export const EXPAND_LABEL = i18n.translate('xpack.agenticInvestigations.hypothesisTree.expand', {
  defaultMessage: 'Expand',
});
export const COLLAPSE_LABEL = i18n.translate(
  'xpack.agenticInvestigations.hypothesisTree.collapse',
  {
    defaultMessage: 'Collapse',
  }
);

export const NO_REASON_LABEL = i18n.translate(
  'xpack.agenticInvestigations.hypothesisTree.detail.noReason',
  {
    defaultMessage: 'No reasoning recorded yet.',
  }
);
export const NO_COMMENT_LABEL = i18n.translate(
  'xpack.agenticInvestigations.hypothesisTree.detail.noComment',
  {
    defaultMessage: 'No rationale recorded.',
  }
);
export const PROPOSAL_REVIEW_HINT = i18n.translate(
  'xpack.agenticInvestigations.hypothesisTree.detail.proposalReviewHint',
  {
    defaultMessage: 'Approve or dismiss it under Proposed actions in the overview.',
  }
);
export const PREVIOUS_ACTION_LABEL = i18n.translate(
  'xpack.agenticInvestigations.hypothesisTree.detail.previousAction',
  {
    defaultMessage: 'Previous action',
  }
);
export const NEXT_ACTION_LABEL = i18n.translate(
  'xpack.agenticInvestigations.hypothesisTree.detail.nextAction',
  {
    defaultMessage: 'Next action',
  }
);
export const actionPositionLabel = (current: number, total: number): string =>
  i18n.translate('xpack.agenticInvestigations.hypothesisTree.detail.actionPosition', {
    defaultMessage: '{current} of {total}',
    values: { current, total },
  });
export const CLOSE_DETAILS_LABEL = i18n.translate(
  'xpack.agenticInvestigations.hypothesisTree.detail.close',
  {
    defaultMessage: 'Close details',
  }
);

export const FIT_VIEW_LABEL = i18n.translate('xpack.agenticInvestigations.hypothesisTree.fitView', {
  defaultMessage: 'Fit to view',
});
export const ENTER_FULL_SCREEN_LABEL = i18n.translate(
  'xpack.agenticInvestigations.hypothesisTree.enterFullScreen',
  {
    defaultMessage: 'Full screen',
  }
);
export const EXIT_FULL_SCREEN_LABEL = i18n.translate(
  'xpack.agenticInvestigations.hypothesisTree.exitFullScreen',
  {
    defaultMessage: 'Exit full screen',
  }
);
export const INVESTIGATING_LABEL = i18n.translate(
  'xpack.agenticInvestigations.hypothesisTree.investigating',
  {
    defaultMessage: 'Investigating…',
  }
);
