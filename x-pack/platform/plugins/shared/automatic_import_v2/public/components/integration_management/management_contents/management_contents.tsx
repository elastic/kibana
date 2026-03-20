/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiStepsProps } from '@elastic/eui';
import { EuiSteps, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { IntegrationDetails } from './integration_details/integration_details';
import * as i18n from './translations';
import { DataStreams } from './data_streams/data_streams';

const useStepStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    stepsContent: css`
      [class*='euiStep__content'] {
        padding-top: ${euiTheme.size.xs};
      }
    `,
  };
};

export const ManagementContents = React.memo(() => {
  const styles = useStepStyles();

  const steps: EuiStepsProps['steps'] = [
    {
      title: i18n.STEP_INTEGRATION_DETAILS,
      titleSize: 'xs',
      children: <IntegrationDetails />,
    },
    {
      title: i18n.STEP_DEFINE_DATA_STREAMS,
      titleSize: 'xs',
      children: <DataStreams />,
    },
  ];

  return <EuiSteps steps={steps} css={styles.stepsContent} />;
});

ManagementContents.displayName = 'ManagementContents';
