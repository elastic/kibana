/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CaseVerdict } from '../../../common/types/domain';

export const VERDICT_LABELS: Record<CaseVerdict, string> = {
  true_positive: i18n.translate('xpack.cases.verdict.truePositive', {
    defaultMessage: 'True positive',
  }),
  false_positive: i18n.translate('xpack.cases.verdict.falsePositive', {
    defaultMessage: 'False positive',
  }),
  benign_positive: i18n.translate('xpack.cases.verdict.benignPositive', {
    defaultMessage: 'Benign positive',
  }),
  suspicious: i18n.translate('xpack.cases.verdict.suspicious', {
    defaultMessage: 'Suspicious',
  }),
  undetermined: i18n.translate('xpack.cases.verdict.undetermined', {
    defaultMessage: 'Undetermined',
  }),
};

export const VERDICT_TITLE = i18n.translate('xpack.cases.caseView.verdict.title', {
  defaultMessage: 'Verdict',
});
export const AI_VERDICT = i18n.translate('xpack.cases.caseView.verdict.ai', {
  defaultMessage: 'AI verdict',
});
export const HUMAN_VERDICT = i18n.translate('xpack.cases.caseView.verdict.human', {
  defaultMessage: 'Human verdict',
});
export const HUMAN_VERDICT_EMPTY = i18n.translate('xpack.cases.caseView.verdict.humanEmpty', {
  defaultMessage: 'Set when the case closes',
});
export const AI_VERDICT_EMPTY = i18n.translate('xpack.cases.caseView.verdict.aiEmpty', {
  defaultMessage: 'None yet',
});
export const AGREES = i18n.translate('xpack.cases.caseView.verdict.agrees', {
  defaultMessage: 'Agrees with AI',
});
export const DIFFERS = i18n.translate('xpack.cases.caseView.verdict.differs', {
  defaultMessage: 'Differs from AI',
});
export const aiVerdictSetBy = (name: string) =>
  i18n.translate('xpack.cases.caseView.verdict.setBy', {
    defaultMessage: 'Set by {name}',
    values: { name },
  });
