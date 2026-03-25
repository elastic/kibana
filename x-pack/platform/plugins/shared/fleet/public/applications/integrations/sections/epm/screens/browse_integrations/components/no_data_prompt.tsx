/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiButton, EuiEmptyPrompt, EuiToolTip } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';

import { useLink, useStartServices } from '../../../../../../../hooks';

export const NoDataPrompt: React.FC = () => {
  const { getHref } = useLink();
  const { licensing } = useStartServices();
  const license = useObservable(licensing.license$);
  const href = useMemo(() => getHref('integration_create'), [getHref]);

  const hasEnterpriseLicense = useMemo(
    () => Boolean(license?.isAvailable && license?.isActive && license?.hasAtLeast('enterprise')),
    [license]
  );

  const enterpriseLicenseTooltip = (
    <FormattedMessage
      id="xpack.fleet.integrations.noDataPromptEnterpriseLicenseTooltip"
      defaultMessage="Creating integrations requires an Enterprise license."
    />
  );

  const createButton = hasEnterpriseLicense ? (
    <EuiButton fill href={href}>
      <FormattedMessage
        id="xpack.fleet.integrations.noDataPromptCreateButton"
        defaultMessage="Create integration"
      />
    </EuiButton>
  ) : (
    <EuiButton fill disabled>
      <FormattedMessage
        id="xpack.fleet.integrations.noDataPromptCreateButton"
        defaultMessage="Create integration"
      />
    </EuiButton>
  );

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
          {!hasEnterpriseLicense ? (
            <EuiToolTip content={enterpriseLicenseTooltip}>{createButton}</EuiToolTip>
          ) : (
            createButton
          )}
        </>
      }
    />
  );
};
