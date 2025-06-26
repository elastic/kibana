/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiButton,
  EuiTitle,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder/config_builder';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { StartDependencies } from './plugin';
import { LensChart } from './embeddable';
import { MultiPaneFlyout } from './flyout';

export const App = (props: {
  core: CoreStart;
  plugins: StartDependencies;
  defaultDataView: DataView;
  stateHelpers: Awaited<ReturnType<LensPublicStart['stateHelperApi']>>;
}) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [isInlineEditingVisible, setIsinlineEditingVisible] = useState(false);
  const [panelActive, setPanelActive] = useState<number | null>(null);

  const configBuilder = useMemo(
    () => new LensConfigBuilder(props.plugins.dataViews, props.stateHelpers.formula),
    [props.plugins.dataViews, props.stateHelpers.formula]
  );

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader
          paddingSize="s"
          bottomBorder={true}
          pageTitle="Lens embeddable inline editing"
        />
        <EuiPageSection paddingSize="s">
          <EuiFlexGroup
            className="eui-fullHeight"
            gutterSize="none"
            direction="row"
            responsive={false}
          >
            <EuiFlexItem className="eui-fullHeight">
              <LensChart
                configBuilder={configBuilder}
                plugins={props.plugins}
                defaultDataView={props.defaultDataView}
                isESQL
                setPanelActive={setPanelActive}
                isActive={Boolean(panelActive === 1) || !panelActive}
              />
            </EuiFlexItem>
            <EuiFlexItem className="eui-fullHeight">
              <LensChart
                configBuilder={configBuilder}
                plugins={props.plugins}
                defaultDataView={props.defaultDataView}
                setPanelActive={setPanelActive}
                isActive={Boolean(panelActive === 2) || !panelActive}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel
                hasShadow={false}
                hasBorder={true}
                css={css`
                  opacity: ${Boolean(panelActive === 3) || !panelActive ? '1' : '0.25'};
                  pointer-events: ${Boolean(panelActive === 3) || !panelActive ? 'all' : 'none'};
                `}
              >
                <EuiTitle
                  size="xs"
                  css={css`
                    text-align: center;
                  `}
                >
                  <h3>#3: Embeddable inside a flyout</h3>
                </EuiTitle>
                <EuiSpacer />
                <EuiTitle
                  size="xxs"
                  css={css`
                    text-align: center;
                  `}
                >
                  <p>
                    In case you do not want to use a push flyout, you can check this example. <br />
                    In this example, we have a Lens embeddable inside a flyout and we want to render
                    the inline editing Component in a second slot of the same flyout.
                  </p>
                </EuiTitle>
                <EuiSpacer />
                <EuiFlexGroup justifyContent="center">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      onClick={() => {
                        setIsFlyoutVisible(true);
                        setPanelActive(3);
                      }}
                    >
                      Show flyout
                    </EuiButton>
                    {isFlyoutVisible ? (
                      <MultiPaneFlyout
                        mainContent={{
                          content: (
                            <LensChart
                              configBuilder={configBuilder}
                              plugins={props.plugins}
                              defaultDataView={props.defaultDataView}
                              container={container}
                              setIsinlineEditingVisible={setIsinlineEditingVisible}
                              onApplyCb={() => {
                                setIsinlineEditingVisible(false);
                                if (container) {
                                  ReactDOM.unmountComponentAtNode(container);
                                }
                              }}
                              onCancelCb={() => {
                                setIsinlineEditingVisible(false);
                                if (container) {
                                  ReactDOM.unmountComponentAtNode(container);
                                }
                              }}
                              isESQL
                              isActive
                            />
                          ),
                        }}
                        inlineEditingContent={{
                          visible: isInlineEditingVisible,
                        }}
                        setContainer={setContainer}
                        onClose={() => {
                          setIsFlyoutVisible(false);
                          setIsinlineEditingVisible(false);
                          setPanelActive(null);
                          if (container) {
                            ReactDOM.unmountComponentAtNode(container);
                          }
                        }}
                      />
                    ) : null}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};
