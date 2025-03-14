/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren } from 'react';
import { EuiAccordion, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

export const OptionalFieldsAccordion = ({ children }: PropsWithChildren) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiAccordion
      element="fieldset"
      id="optionalFieldsAccordion"
      paddingSize="none"
      buttonContent={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.optionalFields',
        { defaultMessage: 'Optional fields' }
      )}
    >
      <div
        css={css`
          border-left: ${euiTheme.border.thin};
          margin-left: ${euiTheme.size.m};
          padding-top: ${euiTheme.size.m};
          padding-left: calc(${euiTheme.size.m} + ${euiTheme.size.xs});
        `}
      >
        {children}
      </div>
    </EuiAccordion>
  );
};
