/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiStat, EuiToolTip } from '@elastic/eui';

interface Props {
  isLoading: boolean;
  title: number | string;
  isMSE: boolean;
}

export const EvaluateStat: FC<Props> = ({ isLoading, isMSE, title }) => {
  const meanSquaredErrorText = i18n.translate(
    'xpack.ml.dataframe.analytics.regressionExploration.meanSquaredErrorText',
    {
      defaultMessage: 'Mean squared error',
    }
  );
  const rSquaredText = i18n.translate(
    'xpack.ml.dataframe.analytics.regressionExploration.rSquaredText',
    {
      defaultMessage: 'R squared',
    }
  );
  const meanSquaredErrorTooltipContent = i18n.translate(
    'xpack.ml.dataframe.analytics.regressionExploration.meanSquaredErrorTooltipContent',
    {
      defaultMessage:
        'Measures how well the regression analysis model is performing. Avg. squared sum of the difference between true and predicted values.',
    }
  );
  const rSquaredTooltipContent = i18n.translate(
    'xpack.ml.dataframe.analytics.regressionExploration.rSquaredTooltipContent',
    {
      defaultMessage:
        'Represents the goodness of fit. Measures how well the observed outcomes are replicated by the model.',
    }
  );
  return (
    <EuiToolTip content={isMSE ? meanSquaredErrorTooltipContent : rSquaredTooltipContent}>
      <EuiStat
        reverse
        isLoading={isLoading}
        title={title}
        description={isMSE ? meanSquaredErrorText : rSquaredText}
        titleSize="xxs"
      />
    </EuiToolTip>
  );
};
