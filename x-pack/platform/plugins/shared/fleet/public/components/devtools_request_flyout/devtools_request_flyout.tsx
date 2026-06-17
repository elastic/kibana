/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef } from 'react';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import type { EuiButtonEmptyProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ViewApiRequestFlyout } from '@kbn/es-ui-shared-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { useStartServices } from '../../hooks';

interface DevtoolsRequestFlyoutButtonProps {
  title?: string;
  description?: string;
  isDisabled?: boolean;
  request: string;
  btnProps?: EuiButtonEmptyProps;
}

export const DevtoolsRequestFlyoutButton: React.FunctionComponent<
  DevtoolsRequestFlyoutButtonProps
> = ({ isDisabled, request, title, description, btnProps = {} }) => {
  const flyoutRef = useRef<ReturnType<typeof services.overlays.openFlyout>>();

  const services = useStartServices();
  const onClick = useCallback(() => {
    const flyout = services.overlays.openFlyout(
      toMountPoint(
        <KibanaContextProvider services={services}>
          <ApiRequestFlyout
            closeFlyout={() => flyout.close()}
            request={request}
            title={title}
            description={description}
          />
        </KibanaContextProvider>,
        services
      )
    );

    flyoutRef.current = flyout;
  }, [services, request, title, description]);

  React.useEffect(() => {
    return () => {
      flyoutRef.current?.close();
    };
  }, []);

  return (
    <EuiButtonEmpty onClick={onClick} isDisabled={isDisabled} {...btnProps}>
      <FormattedMessage
        id="xpack.fleet.apiRequestFlyout.openFlyoutButton"
        defaultMessage="Preview API request"
      />
    </EuiButtonEmpty>
  );
};

export interface ApiRequestFlyoutProps {
  title?: string;
  description?: string;
  isDisabled?: string;
  request: string;
  closeFlyout: () => void;
}

export const ApiRequestFlyout: React.FunctionComponent<ApiRequestFlyoutProps> = ({
  closeFlyout,
  title = i18n.translate('xpack.fleet.apiRequestFlyout.title', {
    defaultMessage: 'Kibana API Request',
  }),
  request,
  description = i18n.translate('xpack.fleet.apiRequestFlyout.description', {
    defaultMessage: 'Perform these request against Kibana',
  }),
}) => {
  const { docLinks, application, share } = useStartServices();

  return (
    <ViewApiRequestFlyout
      // @ts-expect-error ViewApiRequestFlyout title type only allow string
      title={
        <EuiFlexGroup alignItems="baseline">
          <EuiFlexItem grow={false}>{title}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <FormattedMessage
                id="xpack.fleet.apiRequestFlyout.devtoolsRequestDescription"
                defaultMessage="{learnMore}"
                values={{
                  learnMore: (
                    <EuiLink href={docLinks.links.fleet.api}>
                      <FormattedMessage
                        id="xpack.fleet.apiRequestFlyout.learnMoreLink"
                        defaultMessage="Learn more about Fleet API"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      description={description}
      request={request}
      closeFlyout={closeFlyout}
      application={application}
      urlService={share.url}
    />
  );
};
