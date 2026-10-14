/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiShowFor,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EndpointUrl } from '@kbn/shared-components';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';
import { useTelemetryId } from '../context';
import { useElasticsearchUrl } from '../hooks/use_elasticsearch_url';
import { endpointUrlItem } from './connection_details_styles';

export const ConnectionDetails = () => {
  const { url, isLoading } = useElasticsearchUrl();
  const getTelemetryId = useTelemetryId();

  if (!isLoading && !url) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false} css={endpointUrlItem}>
        <EndpointUrl
          url={url}
          isLoading={isLoading}
          copyAriaLabel={i18n.translate(
            'xpack.elasticsearchHome.home.connectionDetails.copyUrlAriaLabel',
            { defaultMessage: 'Copy Elasticsearch URL' }
          )}
          copyTestSubj="elasticsearchHomeCopyEndpointUrl"
          copyTelemetryId={getTelemetryId('copyEndpointUrl')}
        />
      </EuiFlexItem>
      <EuiShowFor sizes={['xl']}>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="text"
            iconType="plusCircle"
            size="s"
            onClick={() =>
              openWiredConnectionDetails({ props: { options: { defaultTabId: 'apiKeys' } } })
            }
            data-test-subj="elasticsearchHomeGenerateApiKeyButton"
            data-telemetry-id={getTelemetryId('connectionDetails-apiKeys')}
          >
            {i18n.translate('xpack.elasticsearchHome.home.connectionDetails.generateApiKey', {
              defaultMessage: 'Generate API key',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiShowFor>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('xpack.elasticsearchHome.home.connectionDetails.tooltip', {
            defaultMessage: 'Connection details',
          })}
        >
          <EuiButtonIcon
            display="base"
            size="s"
            iconSize="m"
            iconType="plugs"
            color="text"
            onClick={() => openWiredConnectionDetails()}
            data-test-subj="elasticsearchHomeConnectionDetailsButton"
            data-telemetry-id={getTelemetryId('connectionDetails')}
            aria-label={i18n.translate('xpack.elasticsearchHome.home.connectionDetails.ariaLabel', {
              defaultMessage: 'Show connection details for connecting to the Elasticsearch API',
            })}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
