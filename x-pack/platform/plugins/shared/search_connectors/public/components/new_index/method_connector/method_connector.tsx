/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { docLinks } from '@kbn/search-connectors';
import { AddConnectorApiLogic } from '../../../api/connector/add_connector_api_logic';

import { AddConnectorLogic } from './add_connector_logic';
import { NewConnectorTemplate } from './new_connector_template';
import { Status } from '../../../../common/types/api';
import { errorToText } from '../../connectors/utils/error_to_text';
import {
  LICENSING_FEATURE,
  LicensingCallout,
} from '../../shared/licensing_callout/licensing_callout';
import { useAppContext } from '../../../app_context';

interface MethodConnectorProps {
  isNative?: boolean;
  serviceType: string;
}

export const MethodConnector: React.FC<MethodConnectorProps> = ({
  serviceType,
  isNative: isNativeProp = true,
}) => {
  const { apiReset, makeRequest } = useActions(AddConnectorLogic);
  const { error, status } = useValues(AddConnectorApiLogic);
  const { connectorTypes, isCloud, hasPlatinumLicense } = useAppContext();
  const NATIVE_CONNECTORS = useMemo(
    () => connectorTypes.filter(({ isNative }) => isNative),
    [connectorTypes]
  );
  const BETA_CONNECTORS = useMemo(
    () => connectorTypes.filter(({ isBeta }) => isBeta),
    [connectorTypes]
  );

  const isNativeAvailable =
    Boolean(NATIVE_CONNECTORS.find((connector) => connector.serviceType === serviceType)) &&
    isCloud;
  const isBeta = Boolean(
    BETA_CONNECTORS.find((connector) => connector.serviceType === serviceType)
  );

  const isNative = isNativeAvailable && isNativeProp;

  const isGated = isNative && !isCloud && !hasPlatinumLicense;

  return (
    <EuiFlexGroup direction="column">
      {isGated && (
        <EuiFlexItem>
          <LicensingCallout feature={LICENSING_FEATURE.NATIVE_CONNECTOR} />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <NewConnectorTemplate
          docsUrl={docLinks.connectors}
          disabled={isGated}
          error={errorToText(error)}
          type="connector"
          onNameChange={() => {
            apiReset();
          }}
          onSubmit={(name) =>
            makeRequest({
              isNative,
              language: null,
              name,
              serviceType,
            })
          }
          buttonLoading={status === Status.LOADING}
          isBeta={isBeta}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
