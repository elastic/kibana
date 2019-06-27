/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { pure } from 'recompose';
import chrome from 'ui/chrome';
import { documentationLinks } from 'ui/documentation_links';

import { HeaderPage } from '../../components/header_page';
import { OverviewHost } from '../../components/page/overview/overview_host';
import { OverviewNetwork } from '../../components/page/overview/overview_network';
import { GlobalTime } from '../../containers/global_time';

import { Summary } from './summary';
import { EmptyPage } from '../../components/empty_page';
import { WithSource, indicesExistOrDataTemporarilyUnavailable } from '../../containers/source';

import * as i18n from './translations';

const basePath = chrome.getBasePath();

export const OverviewComponent = pure(() => {
  const dateEnd = Date.now();
  const dateRange = moment.duration(24, 'hours').asMilliseconds();
  const dateStart = dateEnd - dateRange;

  return (
    <>
      <HeaderPage
        badgeLabel={i18n.PAGE_BADGE_LABEL}
        badgeTooltip={i18n.PAGE_BADGE_TOOLTIP}
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
              actionPrimaryUrl={`${basePath}/app/kibana#/home/tutorial_directory/security`}
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
    </>
  );
});
