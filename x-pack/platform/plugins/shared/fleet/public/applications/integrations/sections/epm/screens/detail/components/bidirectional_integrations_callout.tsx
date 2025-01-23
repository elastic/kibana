/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { EuiCallOut, EuiLink, EuiSpacer, EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { FleetStartServices } from '../../../../../../..';

/**
 * A list of Integration `package.name`'s that support security's bi-directional response actions
 * along with its corresponding storage (local storage) key for persisting the user's dismissal of
 * the callout
 */
const SUPPORTED_INTEGRATIONS_STORAGE_KEY: Readonly<Record<string, string>> = Object.freeze({
  sentinel_one: 'fleet.showSOReponseSupportBanner',
  crowdstrike: 'fleet.showCSResponseSupportBanner',
  microsoft_defender_endpoint: 'fleet.showMSDefenderResponseSupportBanner',
  m365_defender: 'fleet.showMSDefenderResponseSupportBanner', // Same key as the one above
});

const AccentCallout = styled(EuiCallOut)`
  .euiCallOutHeader__title {
    color: ${(props) => props.theme.eui.euiColorAccent};
  }
  background-color: ${(props) => props.theme.eui.euiPanelBackgroundColorModifiers.accent};
`;

export interface BidirectionalIntegrationsBannerProps {
  integrationPackageName: string;
}
export const BidirectionalIntegrationsBanner = memo<BidirectionalIntegrationsBannerProps>(
  ({ integrationPackageName }) => {
    const { docLinks, storage } = useKibana<FleetStartServices>().services;
    const storageKey = SUPPORTED_INTEGRATIONS_STORAGE_KEY[integrationPackageName];
    const [showBanner, setShowBanner] = useState(
      storageKey ? storage.get(storageKey) ?? true : false
    );

    const onDismissHandler = useCallback(() => {
      setShowBanner(false);

      if (storageKey) {
        storage.set(storageKey, false);
      }
    }, [storage, storageKey]);

    const bannerTitle = useMemo(
      () => (
        <EuiTextColor color="accent">
          <FormattedMessage
            id="xpack.fleet.bidirectionalIntegrationsBanner.title"
            defaultMessage={'NEW: Response enabled integration'}
          />
        </EuiTextColor>
      ),
      []
    );

    if (!storageKey || !showBanner) {
      return null;
    }

    return (
      <>
        <AccentCallout
          title={bannerTitle}
          iconType="cheer"
          onDismiss={onDismissHandler}
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
        <EuiSpacer size="s" />
      </>
    );
  }
);
BidirectionalIntegrationsBanner.displayName = 'BidirectionalIntegrationsBanner';
