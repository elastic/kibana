/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { css } from '@emotion/react';

export const EmptyList = ({ addDatabaseButton }: { addDatabaseButton: JSX.Element }) => {
  return (
    <EuiPageTemplate.EmptyPrompt
      iconType="database"
      iconColor="default"
      title={
        <h2 data-test-subj="geoipEmptyListPrompt">
          <FormattedMessage
            id="xpack.ingestPipelines.manageProcessors.geoip.emptyPromptTitle"
            defaultMessage="Add your first database for IP Location processor"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.ingestPipelines.manageProcessors.geoip.emptyPromptDescription"
            defaultMessage="Set up a connection to a custom database when setting up IP Location processor."
          />
        </p>
      }
      actions={addDatabaseButton}
      css={css`
        width: 450px;
        padding: 0 20px 0 20px;
      `}
    />
  );
};
