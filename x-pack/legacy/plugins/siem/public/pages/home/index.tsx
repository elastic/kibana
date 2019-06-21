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
import chrome from 'ui/chrome';

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
import { UrlStateContainer } from '../../components/url_state';

const WrappedByAutoSizer = styled.div`
  height: 100%;
`;

const gutterTimeline = '70px'; // Temporary until timeline is moved - MichaelMarcialis

const Page = styled(EuiPage)`
  ${({ theme }) => `
    padding: 0 ${gutterTimeline} ${theme.eui.euiSizeL} ${theme.eui.euiSizeL};
  `}
`;

const NavGlobal = styled.nav`
  ${({ theme }) => `
    background: ${theme.eui.euiColorEmptyShade};
    border-bottom: ${theme.eui.euiBorderThin};
    margin: 0 -${gutterTimeline} 0 -${theme.eui.euiSizeL};
    padding: ${theme.eui.euiSize} ${gutterTimeline} ${theme.eui.euiSize} ${theme.eui.euiSizeL};
  `}
`;

const usersViewing = ['elastic']; // TODO: get the users viewing this timeline from Elasticsearch (persistance)

/** Returns true if we are running with the k7 design */
const isK7Design = () => chrome.getUiSettingsClient().get('k7design');
/** the global Kibana navigation at the top of every page */
const globalHeaderHeightPx = isK7Design ? 48 : 0;

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
                        <SiemNavigation />
                        <UrlStateContainer indexPattern={indexPattern} />
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiButton
                          data-test-subj="add-data"
                          href="kibana#home/tutorial_directory/security"
                          iconType="plusInCircle"
                        >
                          <FormattedMessage
                            id="xpack.siem.global.addData"
                            defaultMessage="Add data"
                          />
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </NavGlobal>

                  <Switch>
                    <Redirect from="/" exact={true} to="/overview" />
                    <Route path="/overview" component={Overview} />
                    <Route path="/hosts" component={HostsContainer} />
                    <Route path="/network" component={NetworkContainer} />
                    <Route path="/timelines" component={Timelines} />
                    <Route path="/link-to" component={LinkToPage} />
                    <Route component={NotFoundPage} />
                  </Switch>
                </EuiPageBody>
              </DragDropContextWrapper>
            )}
          </WithSource>
        </Page>
      </WrappedByAutoSizer>
    )}
  </AutoSizer>
));
