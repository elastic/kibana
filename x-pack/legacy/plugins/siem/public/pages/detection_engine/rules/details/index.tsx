/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useState } from 'react';
import { StickyContainer } from 'react-sticky';

import { FiltersGlobal } from '../../../../components/filters_global';
import { HeaderPage } from '../../../../components/header_page';
import { HeaderSection } from '../../../../components/header_section';
import { DETECTION_ENGINE_PAGE_NAME } from '../../../../components/link_to/redirect_to_detection_engine';
import { ProgressInline } from '../../../../components/progress_inline';
import { SiemSearchBar } from '../../../../components/search_bar';
import { WrapperPage } from '../../../../components/wrapper_page';
import {
  indicesExistOrDataTemporarilyUnavailable,
  WithSource,
} from '../../../../containers/source';
import { SpyRoute } from '../../../../utils/route/spy_routes';

import { SignalsCharts } from '../../components/signals_chart';
import { SignalsTable } from '../../components/signals';
import { DetectionEngineEmptyPage } from '../../detection_engine_empty_page';

import * as i18n from './translations';

interface RuleDetailsComponentProps {
  ruleId: string;
}

export const RuleDetailsComponent = React.memo<RuleDetailsComponentProps>(({ ruleId }) => {
  const [popoverState, setPopoverState] = useState(false);

  return (
    <>
      <WithSource sourceId="default">
        {({ indicesExist, indexPattern }) => {
          return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <StickyContainer>
              <FiltersGlobal>
                <SiemSearchBar id="global" indexPattern={indexPattern} />
              </FiltersGlobal>

              <WrapperPage>
                <HeaderPage
                  backOptions={{ href: '#detection-engine/rules', text: 'Back to rules' }}
                  badgeOptions={{ text: 'Experimental' }}
                  border
                  subtitle={[
                    'Created by: mmarcialis on 12/28/2019, 12:00 PM',
                    'Updated by: agoldstein on 12/28/2019, 12:00 PM',
                  ]}
                  subtitle2={[
                    'Last signal: 23 minutes ago',
                    <ProgressInline current={95000} max={105000} unit="events">
                      {'Status: Running'}
                    </ProgressInline>,
                  ]}
                  title="Automated exfiltration"
                >
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiSwitch checked={true} label="Activate rule" onChange={() => noop} />
                    </EuiFlexItem>

                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiButton
                            href={`#${DETECTION_ENGINE_PAGE_NAME}/rules/${ruleId}/edit`}
                            iconType="visControls"
                          >
                            {'Edit rule settings'}
                          </EuiButton>
                        </EuiFlexItem>

                        <EuiFlexItem grow={false}>
                          <EuiPopover
                            button={
                              <EuiButtonIcon
                                aria-label="Additional actions"
                                iconType="boxesHorizontal"
                                onClick={() => setPopoverState(!popoverState)}
                              />
                            }
                            closePopover={() => setPopoverState(false)}
                            isOpen={popoverState}
                          >
                            <p>{'Overflow context menu here.'}</p>
                          </EuiPopover>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </HeaderPage>

                <EuiCallOut
                  color="danger"
                  iconType="alert"
                  size="s"
                  title="Rule failed to run on 12/28/2019, 12:00 PM"
                >
                  <p>{'Full fail message here.'}</p>
                </EuiCallOut>

                <EuiSpacer />

                <EuiFlexGroup>
                  <EuiFlexItem component="section" grow={1}>
                    <EuiPanel>
                      <HeaderSection title="Definition" />
                    </EuiPanel>
                  </EuiFlexItem>

                  <EuiFlexItem component="section" grow={2}>
                    <EuiPanel>
                      <HeaderSection title="About" />

                      {/* <p>{'Description'}</p> */}

                      {/* <EuiFlexGrid columns={2}>
                      <EuiFlexItem style={{ flex: '0 0 calc(100% - 24px)' }}>
                        <p>{'Description'}</p>
                      </EuiFlexItem>

                      <EuiFlexItem>
                        <p>{'Severity'}</p>
                      </EuiFlexItem>

                      <EuiFlexItem>
                        <p>{'Risk score boost'}</p>
                      </EuiFlexItem>

                      <EuiFlexItem>
                        <p>{'References'}</p>
                      </EuiFlexItem>

                      <EuiFlexItem>
                        <p>{'False positives'}</p>
                      </EuiFlexItem>

                      <EuiFlexItem>
                        <p>{'Mitre ATT&CK types'}</p>
                      </EuiFlexItem>

                      <EuiFlexItem>
                        <p>{'Tags'}</p>
                      </EuiFlexItem>
                    </EuiFlexGrid> */}
                    </EuiPanel>
                  </EuiFlexItem>

                  <EuiFlexItem component="section" grow={1}>
                    <EuiPanel>
                      <HeaderSection title="Schedule" />
                    </EuiPanel>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer />

                <SignalsCharts />

                <EuiSpacer />

                <SignalsTable />
              </WrapperPage>
            </StickyContainer>
          ) : (
            <WrapperPage>
              <HeaderPage border title={i18n.PAGE_TITLE} />

              <DetectionEngineEmptyPage />
            </WrapperPage>
          );
        }}
      </WithSource>

      <SpyRoute />
    </>
  );
});
RuleDetailsComponent.displayName = 'RuleDetailsComponent';
