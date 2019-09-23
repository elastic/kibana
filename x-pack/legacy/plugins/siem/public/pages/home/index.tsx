/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPage, EuiPageBody } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { pure } from 'recompose';
import styled from 'styled-components';

import { AutoSizer } from '../../components/auto_sizer';
import { DragDropContextWrapper } from '../../components/drag_and_drop/drag_drop_context_wrapper';
import { Flyout, flyoutHeaderHeight } from '../../components/flyout';
import { HelpMenu } from '../../components/help_menu';
import { LinkToPage } from '../../components/link_to';
import { SiemNavigation } from '../../components/navigation';
import { StatefulTimeline } from '../../components/timeline';
import { AutoSaveWarningMsg } from '../../components/timeline/auto_save_warning';
import { NotFoundPage } from '../404';
import { HostsContainer } from '../hosts';
import { NetworkContainer } from '../network';
import { Overview } from '../overview';
import { Timelines } from '../timelines';
import { WithSource } from '../../containers/source';
import { MlPopover } from '../../components/ml_popover/ml_popover';
import { MlHostConditionalContainer } from '../../components/ml/conditional_links/ml_host_conditional_container';
import { MlNetworkConditionalContainer } from '../../components/ml/conditional_links/ml_network_conditional_container';
import { SiemPageName, navTabs } from './home_navigations';
import { UseUrlState } from '../../components/url_state';
import { SpyRoute } from '../../utils/route/spy_routes';

const WrappedByAutoSizer = styled.div`
  height: 100%;
`;

WrappedByAutoSizer.displayName = 'WrappedByAutoSizer';

const gutterTimeline = '70px'; // Temporary until timeline is moved - MichaelMarcialis

const Page = styled(EuiPage)`
  ${({ theme }) => `
    padding: 0 ${gutterTimeline} ${theme.eui.euiSizeL} ${theme.eui.euiSizeL};
  `}
`;

Page.displayName = 'Page';

const NavGlobal = styled.nav`
  ${({ theme }) => `
    background: ${theme.eui.euiColorEmptyShade};
    border-bottom: ${theme.eui.euiBorderThin};
    margin: 0 -${gutterTimeline} 0 -${theme.eui.euiSizeL};
    padding: ${theme.eui.euiSize} ${gutterTimeline} ${theme.eui.euiSize} ${theme.eui.euiSizeL};
  `}
`;

NavGlobal.displayName = 'NavGlobal';

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

export const HomePage = pure(() => (
  <AutoSizer detectAnyWindowResize={true} content>
    {({ measureRef, windowMeasurement: { height: windowHeight = 0 } }) => (
      <WrappedByAutoSizer data-test-subj="wrapped-by-auto-sizer" innerRef={measureRef}>
        <Page data-test-subj="pageContainer">
          <HelpMenu />
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

                <EuiPageBody>
                  <NavGlobal>
                    <EuiFlexGroup alignItems="center" gutterSize="m" justifyContent="spaceBetween">
                      <EuiFlexItem>
                        <SiemNavigation navTabs={navTabs} />
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup
                          alignItems="center"
                          gutterSize="m"
                          responsive={false}
                          wrap={true}
                        >
                          <EuiFlexItem grow={false}>
                            <MlPopover />
                          </EuiFlexItem>

                          <EuiFlexItem grow={false}>
                            <EuiButton
                              data-test-subj="add-data"
                              href="kibana#home/tutorial_directory/siem"
                              iconType="plusInCircle"
                            >
                              <FormattedMessage
                                id="xpack.siem.global.addData"
                                defaultMessage="Add data"
                              />
                            </EuiButton>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </NavGlobal>
                  <Switch>
                    <Redirect from="/" exact={true} to={`/${SiemPageName.overview}`} />
                    <Route
                      path={`/:pageName(${SiemPageName.overview})`}
                      render={() => <Overview />}
                    />
                    <Route
                      path={`/:pageName(${SiemPageName.hosts})`}
                      render={({ match, location }) => (
                        <HostsContainer url={match.url} location={location} />
                      )}
                    />
                    <Route
                      path={`/:pageName(${SiemPageName.network})`}
                      render={({ match, location }) => (
                        <NetworkContainer url={match.url} location={location} />
                      )}
                    />
                    <Route
                      path={`/:pageName(${SiemPageName.timelines})`}
                      render={() => <Timelines />}
                    />
                    <Route path="/link-to" component={LinkToPage} />
                    <Route
                      path="/ml-hosts"
                      render={({ match, location }) => (
                        <MlHostConditionalContainer url={match.url} location={location} />
                      )}
                    />
                    <Route
                      path="/ml-network"
                      render={({ match, location }) => (
                        <MlNetworkConditionalContainer url={match.url} location={location} />
                      )}
                    />
                    <Route component={NotFoundPage} />
                  </Switch>
                </EuiPageBody>
              </DragDropContextWrapper>
            )}
          </WithSource>
        </Page>
        <SpyRoute />
      </WrappedByAutoSizer>
    )}
  </AutoSizer>
));

HomePage.displayName = 'HomePage';
