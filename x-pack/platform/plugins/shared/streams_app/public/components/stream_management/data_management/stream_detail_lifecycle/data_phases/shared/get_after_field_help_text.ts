/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PhaseName } from '@kbn/streams-schema';

export const getAfterFieldHelpText = ({
  previousPhase,
  previousPhaseAfter,
}: {
  previousPhase: PhaseName;
  previousPhaseAfter: string | undefined;
}): string | undefined => {
  if (previousPhase === 'hot') return;
  if (!previousPhaseAfter) return;

  return i18n.translate('xpack.streams.dataPhases.afterField.helpText', {
    defaultMessage: 'Must occur after the {phase} phase ({after}).',
    values: {
      phase: previousPhase,
      after: previousPhaseAfter,
    },
  });
};
