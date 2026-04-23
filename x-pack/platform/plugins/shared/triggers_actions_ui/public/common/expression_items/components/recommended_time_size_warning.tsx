/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import React from 'react';

function RecommendedTimeSizeWarning() {
  const description = i18n.translate(
    'xpack.triggersActionsUI.observability.rules.customThreshold.recommendedTimeSizeWarning.description',
    {
      defaultMessage:
        'Recommended minimum value is 5 minutes. This is to ensure, that the alert has enough data to evaluate. If you choose a lower values, the alert may not work as expected.',
    }
  );

  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        title={i18n.translate(
          'xpack.triggersActionsUI.observability.rules.customThreshold.recommendedTimeSizeWarning.title',
          { defaultMessage: `Value is too low, possible alerting noise` }
        )}
        color="warning"
        iconType="warning"
        size="s"
        css={css`
          max-width: 400px;
        `}
      >
        <p>{description}</p>
      </EuiCallOut>
    </>
  );
}

// eslint-disable-next-line import/no-default-export
export { RecommendedTimeSizeWarning as default };
