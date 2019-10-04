/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiIcon } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import { useUrlParams } from '../../hooks';

interface OverviewPageLinkProps {
  pagination: string;
  direction: string;
}

export const OverviewPageLink: FunctionComponent<OverviewPageLinkProps> = ({
  children,
  pagination,
  direction,
}) => {
  const [, updateUrlParams] = useUrlParams();
  const icon = direction === 'prev' ? 'arrowLeft' : 'arrowRight';

  const color = pagination ? 'primary' : 'ghost';

  return (
    <EuiLink
      onClick={() => {
        updateUrlParams({ pagination });
      }}
    >
      <EuiIcon type={icon} color={color} />
    </EuiLink>
  return !!pagination ? (
    <EuiLink
      onClick={() => {
        updateUrlParams({ pagination });
      }}
    >
      <EuiIcon type={icon} color={color} />
    </EuiLink>
  ) : (
    <EuiButtonIcon
      aria-label={i18n.translate('xpack.uptime.overviewPageLink.disabled.ariaLabel', {
        defaultMessage:
          'A disabled pagination button indicating that there cannot be any further navigation in the monitors list.',
      })}
      color={color}
      disabled={true}
      iconType={icon}
    />
  );
};
