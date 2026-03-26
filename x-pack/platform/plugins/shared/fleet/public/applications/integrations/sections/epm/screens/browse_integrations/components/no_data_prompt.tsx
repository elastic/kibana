/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { useLink } from '../../../../../../../hooks';

export const NoDataPrompt: React.FC = () => {
  const { getHref } = useLink();
  const href = useMemo(() => getHref('integration_create'), [getHref]);

  return (
    <EuiEmptyPrompt
      iconType="info"
      titleSize="s"
      title={
        <h3>
          <FormattedMessage
            id="xpack.fleet.integrations.noDataPromptTitle"
            defaultMessage="No integrations match your search criteria"
          />
        </h3>
      }
      body={
        <>
          <p>
            <FormattedMessage
              id="xpack.fleet.integrations.noDataPromptBody"
              defaultMessage="Try adjusting your search or filters. {br}
You can also create an integration tailored to your needs."
              values={{ br: <br /> }}
            />
          </p>
          <EuiButton fill href={href}>
            <FormattedMessage
              id="xpack.fleet.integrations.noDataPromptCreateButton"
              defaultMessage="Create integration"
            />
          </EuiButton>
        </>
      }
    />
  );
};
