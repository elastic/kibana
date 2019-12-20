/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import chrome from 'ui/chrome';
import { documentationLinks } from 'ui/documentation_links';

import { EmptyPage } from '../../components/empty_page';
import { HeaderPage } from '../../components/header_page';
import { OverviewHost } from '../../components/page/overview/overview_host';
import { OverviewNetwork } from '../../components/page/overview/overview_network';
import { WrapperPage } from '../../components/wrapper_page';
import { GlobalTime } from '../../containers/global_time';
import { WithSource, indicesExistOrDataTemporarilyUnavailable } from '../../containers/source';
import { SpyRoute } from '../../utils/route/spy_routes';
import { Summary } from './summary';
import * as i18n from './translations';

const basePath = chrome.getBasePath();

export const OverviewComponent = React.memo(() => {
  const dateEnd = Date.now();
  const dateRange = moment.duration(24, 'hours').asMilliseconds();
  const dateStart = dateEnd - dateRange;

  return (
    <>
      <WrapperPage>
        <HeaderPage
          badgeOptions={{
            beta: true,
            text: i18n.PAGE_BADGE_LABEL,
            tooltip: i18n.PAGE_BADGE_TOOLTIP,
          }}
          border
          subtitle={i18n.PAGE_SUBTITLE}
          title={i18n.PAGE_TITLE}
        />

        <WithSource sourceId="default">
          {({ indicesExist }) =>
            indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <GlobalTime>
                {({ setQuery }) => (
                  <EuiFlexGroup>
                    <Summary />
                    <OverviewHost endDate={dateEnd} startDate={dateStart} setQuery={setQuery} />
                    <OverviewNetwork endDate={dateEnd} startDate={dateStart} setQuery={setQuery} />
                  </EuiFlexGroup>
                )}
              </GlobalTime>
            ) : (
              <EmptyPage
                actionPrimaryIcon="gear"
                actionPrimaryLabel={i18n.EMPTY_ACTION_PRIMARY}
                actionPrimaryUrl={`${basePath}/app/kibana#/home/tutorial_directory/siem`}
                actionSecondaryIcon="popout"
                actionSecondaryLabel={i18n.EMPTY_ACTION_SECONDARY}
                actionSecondaryTarget="_blank"
                actionSecondaryUrl={documentationLinks.siem}
                data-test-subj="empty-page"
                title={i18n.EMPTY_TITLE}
              />
            )
          }
        </WithSource>
      </WrapperPage>

      <SpyRoute />
    </>
  );
});
OverviewComponent.displayName = 'OverviewComponent';
