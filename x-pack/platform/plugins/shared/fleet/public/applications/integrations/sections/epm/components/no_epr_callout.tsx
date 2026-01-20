/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FunctionComponent } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink } from '@elastic/eui';

import { useStartServices } from '../../../../../hooks';

export const NoEprCallout: FunctionComponent<{ statusCode?: number }> = ({
  statusCode,
}: {
  statusCode?: number;
}) => {
  let titleMessage;
  let descriptionMessage;

  if (statusCode === 502) {
    titleMessage = i18n.translate('xpack.fleet.epmList.eprUnavailableBadGatewayCalloutTitle', {
      defaultMessage:
        'Kibana cannot reach the Elastic Package Registry, which provides Elastic Agent integrations',
    });
    descriptionMessage = (
      <FormattedMessage
        id="xpack.fleet.epmList.eprUnavailableCallouBdGatewaytTitleMessage"
        defaultMessage="To view these integrations, configure a  {registryproxy} or host {onpremregistry}."
        values={{
          registryproxy: <ProxyLink />,
          onpremregistry: <OnPremLink />,
        }}
      />
    );
  } else {
    titleMessage = i18n.translate('xpack.fleet.epmList.eprUnavailable400500CalloutTitle', {
      defaultMessage:
        'Kibana cannot connect to the Elastic Package Registry, which provides Elastic Agent integrations',
    });
    descriptionMessage = (
      <FormattedMessage
        id="xpack.fleet.epmList.eprUnavailableCallout400500TitleMessage"
        defaultMessage="Ensure the {registryproxy} or {onpremregistry} is configured correctly, or try again later."
        values={{
          registryproxy: <ProxyLink />,
          onpremregistry: <OnPremLink />,
        }}
      />
    );
  }

  return (
    <EuiCallOut title={titleMessage} iconType="info" color={'warning'}>
      <p>{descriptionMessage}</p>
    </EuiCallOut>
  );
};

function ProxyLink() {
  const { docLinks } = useStartServices();

  return (
    <EuiLink href={docLinks.links.fleet.settingsFleetServerProxySettings} target="_blank">
      {i18n.translate('xpack.fleet.epmList.proxyLinkSnippedText', {
        defaultMessage: 'proxy server',
      })}
    </EuiLink>
  );
}

function OnPremLink() {
  const { docLinks } = useStartServices();

  return (
    <EuiLink href={docLinks.links.fleet.onPremRegistry} target="_blank">
      {i18n.translate('xpack.fleet.epmList.onPremLinkSnippetText', {
        defaultMessage: 'your own registry',
      })}
    </EuiLink>
  );
}
