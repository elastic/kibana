/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import styled from 'styled-components';

import { AutoSizer } from '../../components/auto_sizer';
import { DragDropContextWrapper } from '../../components/drag_and_drop/drag_drop_context_wrapper';
import { Flyout, flyoutHeaderHeight } from '../../components/flyout';
import { HeaderGlobal } from '../../components/header_global';
import { HelpMenu } from '../../components/help_menu';
import { LinkToPage } from '../../components/link_to';
import { MlHostConditionalContainer } from '../../components/ml/conditional_links/ml_host_conditional_container';
import { MlNetworkConditionalContainer } from '../../components/ml/conditional_links/ml_network_conditional_container';
import { StatefulTimeline } from '../../components/timeline';
import { AutoSaveWarningMsg } from '../../components/timeline/auto_save_warning';
import { UseUrlState } from '../../components/url_state';
import { WithSource } from '../../containers/source';
import { SpyRoute } from '../../utils/route/spy_routes';
import { NotFoundPage } from '../404';
import { DetectionEngineContainer } from '../detection_engine';
import { HostsContainer } from '../hosts';
import { NetworkContainer } from '../network';
import { Overview } from '../overview';
import { Timelines } from '../timelines';
import { navTabs } from './home_navigations';
import { SiemPageName } from './types';

/*
 * This is import is important to keep because if we do not have it
 * we will loose the map embeddable until they move to the New Platform
 * we need to have it
 */
import 'uiExports/embeddableFactories';

const WrappedByAutoSizer = styled.div`
  height: 100%;
`;
WrappedByAutoSizer.displayName = 'WrappedByAutoSizer';

const usersViewing = ['elastic']; // TODO: get the users viewing this timeline from Elasticsearch (persistance)

/** the global Kibana navigation at the top of every page */
const globalHeaderHeightPx = 48;

const calculateFlyoutHeight = ({
  globalHeaderSize,
  windowHeight,
}: {
  globalHeaderSize: number;
  windowHeight: number;
}): number => Math.max(0, windowHeight - globalHeaderSize);

export const HomePage: React.FC = () => (
  <AutoSizer detectAnyWindowResize={true} content>
    {({ measureRef, windowMeasurement: { height: windowHeight = 0 } }) => (
      <WrappedByAutoSizer data-test-subj="wrapped-by-auto-sizer" ref={measureRef}>
        <HeaderGlobal />

        <main data-test-subj="pageContainer">
          <WithSource sourceId="default">
            {({ browserFields, indexPattern }) => (
              <DragDropContextWrapper browserFields={browserFields}>
                <UseUrlState indexPattern={indexPattern} navTabs={navTabs} />
                <AutoSaveWarningMsg />
                <Flyout
                  flyoutHeight={calculateFlyoutHeight({
                    globalHeaderSize: globalHeaderHeightPx,
                    windowHeight,
                  })}
                  headerHeight={flyoutHeaderHeight}
                  timelineId="timeline-1"
                  usersViewing={usersViewing}
                >
                  <StatefulTimeline
                    flyoutHeaderHeight={flyoutHeaderHeight}
                    flyoutHeight={calculateFlyoutHeight({
                      globalHeaderSize: globalHeaderHeightPx,
                      windowHeight,
                    })}
                    id="timeline-1"
                  />
                </Flyout>

                <Switch>
                  <Redirect exact from="/" to={`/${SiemPageName.overview}`} />
                  <Route
                    path={`/:pageName(${SiemPageName.overview})`}
                    render={() => <Overview />}
                  />
                  <Route
                    path={`/:pageName(${SiemPageName.hosts})`}
                    render={({ location, match }) => (
                      <HostsContainer location={location} url={match.url} />
                    )}
                  />
                  <Route
                    path={`/:pageName(${SiemPageName.network})`}
                    render={({ location, match }) => (
                      <NetworkContainer location={location} url={match.url} />
                    )}
                  />
                  <Route
                    path={`/:pageName(${SiemPageName.detectionEngine})`}
                    render={({ location, match }) => (
                      <DetectionEngineContainer location={location} url={match.url} />
                    )}
                  />
                  <Route
                    path={`/:pageName(${SiemPageName.timelines})`}
                    render={() => <Timelines />}
                  />
                  <Route path="/link-to" render={props => <LinkToPage {...props} />} />
                  <Route
                    path="/ml-hosts"
                    render={({ location, match }) => (
                      <MlHostConditionalContainer location={location} url={match.url} />
                    )}
                  />
                  <Route
                    path="/ml-network"
                    render={({ location, match }) => (
                      <MlNetworkConditionalContainer location={location} url={match.url} />
                    )}
                  />
                  <Route render={() => <NotFoundPage />} />
                </Switch>
              </DragDropContextWrapper>
            )}
          </WithSource>
        </main>

        <HelpMenu />

        <SpyRoute />
      </WrappedByAutoSizer>
    )}
  </AutoSizer>
);

HomePage.displayName = 'HomePage';
