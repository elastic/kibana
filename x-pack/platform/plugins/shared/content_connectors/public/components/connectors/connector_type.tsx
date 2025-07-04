/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CRAWLER_SERVICE_TYPE } from '@kbn/search-connectors';
import { useAppContext } from '../../app_context';

export interface ConnectorTypeProps {
  serviceType: string;
}

export const ConnectorType: React.FC<ConnectorTypeProps> = ({ serviceType }) => {
  const { connectorTypes } = useAppContext();
  // TODO service_type === "" is considered unknown/custom connector multiple places replace all of them with a better solution
  const CUSTOM_CONNECTOR = useMemo(
    () => connectorTypes.filter(({ serviceType: type }) => type === ''),
    [connectorTypes]
  );
  const connector =
    connectorTypes.find((c) => c.serviceType === serviceType) || CUSTOM_CONNECTOR[0];
  return (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      {connector && connector.iconPath && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={connector.iconPath} size="m" />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiText size="s">
          <p>
            {serviceType === CRAWLER_SERVICE_TYPE
              ? i18n.translate('xpack.contentConnectors.content.connectors.connectorType.crawler', {
                  defaultMessage: 'Web crawler',
                })
              : connector?.name ?? '-'}
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
