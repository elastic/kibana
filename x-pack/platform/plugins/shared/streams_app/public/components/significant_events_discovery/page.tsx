/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useStreamsAppBreadcrumbs } from '../../hooks/use_streams_app_breadcrumbs';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { FeedbackButton } from '../feedback_button';
import { RedirectTo } from '../redirect_to';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { StreamsTree } from './components/streams_tree/streams_tree';

export function SignificantEventsDiscoveryPage() {
  const {
    features: { significantEventsDiscovery },
  } = useStreamsPrivileges();
  const { euiTheme } = useEuiTheme();

  useStreamsAppBreadcrumbs(() => {
    return [
      {
        title: i18n.translate('xpack.streams.significantEventsDiscovery.breadcrumbTitle', {
          defaultMessage: 'Significant events Discovery',
        }),
        path: '/_discovery',
      },
    ];
  }, []);

  if (significantEventsDiscovery === undefined) {
    // Waiting to load license
    return <EuiLoadingElastic size="xxl" />;
  }

  if (!significantEventsDiscovery.available || !significantEventsDiscovery.enabled) {
    return <RedirectTo path="/" />;
  }

  return (
    <>
      <StreamsAppPageTemplate.Header
        bottomBorder="extended"
        css={css`
          background: ${euiTheme.colors.backgroundBasePlain};
        `}
        pageTitle={
          <EuiFlexGroup
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
            alignItems="center"
          >
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="m">
                {i18n.translate('xpack.streams.significantEventsDiscovery.pageHeaderTitle', {
                  defaultMessage: 'Significant Events Discovery',
                })}
              </EuiFlexGroup>
            </EuiFlexItem>
            <FeedbackButton />
          </EuiFlexGroup>
        }
      />
      <StreamsAppPageTemplate.Body grow>
        <StreamsTree />
      </StreamsAppPageTemplate.Body>
    </>
  );
}
