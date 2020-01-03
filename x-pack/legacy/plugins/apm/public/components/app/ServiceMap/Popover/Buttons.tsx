/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { getAPMHref } from '../../../shared/Links/apm/APMLink';
import { useUrlParams } from '../../../../hooks/useUrlParams';

interface ButtonsProps {
  serviceName: string;
}

export function Buttons({ serviceName }: ButtonsProps) {
  const currentSearch = useUrlParams().urlParams.kuery ?? '';
  const detailsUrl = getAPMHref(
    `/services/${serviceName}/transactions`,
    currentSearch
  );
  const focusUrl = getAPMHref(
    `/services/${serviceName}/service-map`,
    currentSearch
  );

  return (
    <>
      <EuiFlexItem>
        <EuiButton href={detailsUrl} fill={true}>
          {i18n.translate('xpack.apm.serviceMap.serviceDetailsButtonText', {
            defaultMessage: 'Service Details'
          })}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton href={focusUrl} color="secondary">
          {i18n.translate('xpack.apm.serviceMap.focusMapButtonText', {
            defaultMessage: 'Focus map'
          })}
        </EuiButton>
      </EuiFlexItem>
    </>
  );
}
