/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiCallOut, EuiLink, EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

const AccentCallout = styled(EuiCallOut)`
  .euiCallOutHeader__title {
    color: ${(props) => props.theme.eui.euiColorAccent};
  }
  background-color: ${(props) => props.theme.eui.euiPanelBackgroundColorModifiers.accent};
`;

export interface BidirectionalIntegrationsBannerProps {
  onDismiss: () => void;
}
export const BidirectionalIntegrationsBanner = memo<BidirectionalIntegrationsBannerProps>(
  ({ onDismiss }) => {
    const { docLinks } = useKibana().services;

    const bannerTitle = (
      <EuiTextColor color="accent">
        <FormattedMessage
          id="xpack.fleet.bidirectionalIntegrationsBanner.title"
          defaultMessage={'NEW: Response enabled integration'}
        />
      </EuiTextColor>
    );

    return (
      <AccentCallout
        title={bannerTitle}
        iconType="cheer"
        onDismiss={onDismiss}
        data-test-subj={'bidirectionalIntegrationsCallout'}
      >
        <FormattedMessage
          id="xpack.fleet.bidirectionalIntegrationsBanner.body"
          defaultMessage="Orchestrate response actions across endpoint vendors with bidirectional integrations. {learnmore}."
          values={{
            learnmore: (
              <EuiLink
                href={docLinks?.links.securitySolution.bidirectionalIntegrations}
                target="_blank"
                data-test-subj="bidirectionalIntegrationDocLink"
              >
                <FormattedMessage
                  id="xpack.fleet.bidirectionalIntegrations.doc.link"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            ),
          }}
        />
      </AccentCallout>
    );
  }
);
BidirectionalIntegrationsBanner.displayName = 'BidirectionalIntegrationsBanner';
