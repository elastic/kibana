/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

const getModelsBadge = (count: number) =>
  i18n.translate('xpack.evals.evaluatorModelsBadge.multiple', {
    defaultMessage: '{count} models',
    values: { count },
  });

const NO_MODEL = '-';

interface EvaluatorModelsBadgeProps {
  models: Array<{ id: string }> | undefined;
}

/**
 * Names the judge models an experiment's evaluators used. Evaluators can each judge with their
 * own model, so several collapse into a count with the ids in a tooltip rather than a single
 * badge that would misattribute the rest. Experiments only code evaluators scored have none.
 */
export const EvaluatorModelsBadge: React.FC<EvaluatorModelsBadgeProps> = ({ models }) => {
  const modelIds = Array.from(new Set((models ?? []).map(({ id }) => id).filter(Boolean))).sort();

  if (modelIds.length === 0) {
    return <>{NO_MODEL}</>;
  }

  if (modelIds.length === 1) {
    return <EuiBadge color="accent">{modelIds[0]}</EuiBadge>;
  }

  return (
    <EuiToolTip content={modelIds.join(', ')}>
      <EuiBadge color="accent" tabIndex={0}>
        {getModelsBadge(modelIds.length)}
      </EuiBadge>
    </EuiToolTip>
  );
};
