/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './frame_layout.scss';

import React from 'react';
import { EuiScreenReaderOnly, EuiFlexGroup, EuiFlexItem, EuiPage, EuiPageBody, useEuiTheme, euiBreakpoint } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { useLensSelector, selectIsFullscreenDatasource } from '../../state_management';
import { css } from '@emotion/react';

export interface FrameLayoutProps {
  dataPanel: React.ReactNode;
  configPanel?: React.ReactNode;
  suggestionsPanel?: React.ReactNode;
  workspacePanel?: React.ReactNode;
  bannerMessages?: React.ReactNode;
}

export function FrameLayout(props: FrameLayoutProps) {
  const isFullscreen = useLensSelector(selectIsFullscreenDatasource);
  const euiTheme = useEuiTheme();

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
      <EuiFlexItem grow={true} css={css`position: relative`}>
        <EuiPage
          paddingSize="none"
          css={css`
            padding: 0;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: hidden;
            flex-direction: column;
            ${euiBreakpoint(euiTheme, ['xs', 's', 'm'])} {
              position: static;
            }
            ${isFullscreen && `.lnsFrameLayout__sidebar--left {
              // Hide the datapanel in fullscreen mode. Using display: none does trigger
              // a rerender when the container becomes visible again, maybe pushing offscreen is better
              display: none;
            }`} 
          `}
        >
          <EuiPageBody
            restrictWidth={false}
            className="lnsFrameLayout__pageContent"
            aria-labelledby="lns_ChartTitle"
          >
            <section
              className={'lnsFrameLayout__sidebar lnsFrameLayout__sidebar--left hide-for-sharing'}
              aria-labelledby="dataPanelId"
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
              className={classNames('lnsFrameLayout__pageBody', {
                'lnsFrameLayout__pageBody-isFullscreen': isFullscreen,
              })}
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
              <div className="lnsFrameLayout__suggestionPanel hide-for-sharing">
                {props.suggestionsPanel}
              </div>
            </section>
            <section
              css={css`${isFullscreen && `flex: 1; max-width: none;`}`}
              className={classNames(
                'lnsFrameLayout__sidebar lnsFrameLayout__sidebar--right',
                'hide-for-sharing',
                {
                  'lnsFrameLayout__sidebar-isFullscreen': isFullscreen,
                }
              )}
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
