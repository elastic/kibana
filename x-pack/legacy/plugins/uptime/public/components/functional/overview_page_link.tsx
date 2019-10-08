/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiIcon, EuiButtonIcon } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { useUrlParams } from '../../hooks';

interface OverviewPageLinkProps {
  dataTestSubj: string;
  direction: string;
  pagination: string;
}

export const OverviewPageLink: FunctionComponent<OverviewPageLinkProps> = ({
  dataTestSubj,
  direction,
  pagination,
}) => {
  const [, updateUrlParams] = useUrlParams();
  const icon = direction === 'prev' ? 'arrowLeft' : 'arrowRight';

  const color = pagination ? 'primary' : 'ghost';
  const ariaLabel =
    direction === 'next'
      ? i18n.translate('xpack.uptime.overviewPageLink.next.ariaLabel', {
          defaultMessage: 'Next page of results',
        })
      : i18n.translate('xpack.uptime.overviewPageLink.prev.ariaLabel', {
          defaultMessage: 'Prev page of results',
        });

  return !!pagination ? (
    <EuiLink
      aria-label={ariaLabel}
      data-test-subj={dataTestSubj}
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
