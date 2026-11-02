/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiScreenReaderOnly,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  useEuiTheme,
  euiBreakpoint,
  type UseEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import classNames from 'classnames';
import { useLensSelector, selectIsFullscreenDatasource } from '../../state_management';

export interface FrameLayoutProps {
  dataPanel: React.ReactNode;
  configPanel?: React.ReactNode;
  suggestionsPanel?: React.ReactNode;
  workspacePanel?: React.ReactNode;
  bannerMessages?: React.ReactNode;
}

export function FrameLayout(props: FrameLayoutProps) {
  const isFullscreen = useLensSelector(selectIsFullscreenDatasource);
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  return (
    <EuiFlexGroup direction="column" responsive={false} gutterSize="none" alignItems="stretch">
      {props.bannerMessages ? (
        <EuiFlexItem grow={false}>
          <aside aria-labelledby="bannerMessagesId">
            <EuiScreenReaderOnly>
              <h2 id="bannerMessagesId">
                {i18n.translate('xpack.lens.section.bannerMessagesLabel', {
                  defaultMessage: 'Deprecation messages',
                })}
              </h2>
            </EuiScreenReaderOnly>
            {props.bannerMessages}
          </aside>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem
        grow={true}
        css={css`
          position: relative;
        `}
      >
        <EuiPage
          paddingSize="none"
          css={css`
            padding: 0;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            /* Use 'clip' for y-axis to constrain layout, 'visible' for x-axis to allow
               drag-drop extra targets in the config panel to overflow horizontally. */
            overflow-y: clip;
            overflow-x: visible;
            flex-direction: column;
            ${euiBreakpoint(euiThemeContext, ['xs', 's', 'm'])} {
              position: static;
            }
          `}
        >
          <EuiPageBody
            restrictWidth={false}
            className="lnsFrameLayout__pageContent"
            aria-labelledby="lns_ChartTitle"
            css={css`
              /* Use 'clip' for y-axis to constrain layout, 'visible' for x-axis to allow
                 drag-drop extra targets in the config panel to overflow horizontally. */
              overflow-y: clip;
              overflow-x: visible;
              flex-grow: 1;
              flex-direction: row;
              ${euiBreakpoint(euiThemeContext, ['xs', 's', 'm'])} {
                flex-wrap: wrap;
                overflow: auto;
                > * {
                  flex-basis: 100%;
                }
              }
            `}
          >
            <section
              className="hide-for-sharing"
              aria-labelledby="dataPanelId"
              css={[
                sidebarStyles(euiThemeContext),
                isFullscreen &&
                  css`
                    // Hide the datapanel in fullscreen mode. Using display: none does trigger
                    // a rerender when the container becomes visible again, maybe pushing offscreen is better
                    display: none;
                  `,
              ]}
            >
              <EuiScreenReaderOnly>
                <h2 id="dataPanelId">
                  {i18n.translate('xpack.lens.section.dataPanelLabel', {
                    defaultMessage: 'Data panel',
                  })}
                </h2>
              </EuiScreenReaderOnly>
              {props.dataPanel}
            </section>
            <section
              className={classNames('eui-scrollBar', 'lnsVisualizationWorkspace_container')}
              css={css`
                min-width: 432px;
                overflow: hidden auto;
                display: flex;
                flex-direction: column;
                flex: 1 1 100%;
                // Leave out bottom padding so the suggestions scrollbar stays flush to window edge
                // Leave out left padding so the left sidebar's focus states are visible outside of content bounds
                // This also means needing to add same amount of margin to page content and suggestion items
                padding: ${euiTheme.size.base} ${euiTheme.size.base} 0;
                position: relative;
                z-index: 1;
                border-left: ${euiTheme.border.thin};
                border-right: ${euiTheme.border.thin};
                &:first-child {
                  padding-left: ${euiTheme.size.base};
                }
                ${isFullscreen &&
                `
                  flex: 1;
                  padding: 0;`}
              `}
              aria-labelledby="workspaceId"
            >
              <EuiScreenReaderOnly>
                <h2 id="workspaceId">
                  {i18n.translate('xpack.lens.section.workspaceLabel', {
                    defaultMessage: 'Visualization workspace',
                  })}
                </h2>
              </EuiScreenReaderOnly>
              {props.workspacePanel}
              <div className="hide-for-sharing">{props.suggestionsPanel}</div>
            </section>
            <section
              css={[
                sidebarStyles(euiThemeContext),
                css`
                  flex-basis: 25%;
                  min-width: 358px;
                  max-width: 440px;
                  max-height: 100%;
                  /* Use 'clip' for y-axis to constrain flex children for scrolling,
                     and 'visible' for x-axis to allow drag-drop extra targets to overflow.
                     Unlike 'hidden'/'auto', 'clip' can be combined with 'visible' on the other axis. */
                  overflow-y: clip;
                  overflow-x: visible;
                  ${euiBreakpoint(euiThemeContext, ['xs', 's', 'm'])} {
                    max-width: 100%;
                  }
                  ${isFullscreen && `flex: 1; max-width: none;`}
                `,
              ]}
              className="hide-for-sharing"
              aria-labelledby="configPanel"
            >
              <EuiScreenReaderOnly>
                <h2 id="configPanel">
                  {i18n.translate('xpack.lens.section.configPanelLabel', {
                    defaultMessage: 'Config panel',
                  })}
                </h2>
              </EuiScreenReaderOnly>
              {props.configPanel}
            </section>
          </EuiPageBody>
        </EuiPage>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const sidebarStyles = (euiThemeContext: UseEuiTheme) => css`
  margin: 0;
  flex: 1 0 18%;
  min-width: 304px;
  display: flex;
  flex-direction: column;
  position: relative;
  ${euiBreakpoint(euiThemeContext, ['xs', 's', 'm'])} {
    min-height: 360px;
  }
`;
