/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment } from 'react';
import { EuiCard, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ML_PAGES } from '../../../../../../../common/constants/locator';
import { useCreateAndNavigateToManagementMlLink } from '../../../../../contexts/kibana/use_create_url';

export const BackToListPanel: FC = () => {
  const redirectToAnalyticsList = useCreateAndNavigateToManagementMlLink(
    ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
    'analytics'
  );

  return (
    <Fragment>
      <EuiCard
        css={{ width: '300px' }}
        icon={<EuiIcon size="xxl" type="list" />}
        title={i18n.translate('xpack.ml.dataframe.analytics.create.analyticsListCardTitle', {
          defaultMessage: 'Data Frame Analytics',
        })}
        description={i18n.translate(
          'xpack.ml.dataframe.analytics.create.analyticsListCardDescription',
          {
            defaultMessage: 'Return to the analytics management page.',
          }
        )}
        onClick={redirectToAnalyticsList}
        data-test-subj="analyticsWizardCardManagement"
      />
    </Fragment>
  );
};
