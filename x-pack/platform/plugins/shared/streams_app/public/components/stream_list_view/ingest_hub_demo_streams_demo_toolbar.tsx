/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { useTimefilter } from '../../hooks/use_timefilter';

export type IngestHubDemoStreamsListViewMode = 'table' | 'canvas';

export type IngestHubDemoStreamsDemoToolbarLayout = 'default' | 'pageHeader';

export interface IngestHubDemoStreamsDemoToolbarProps {
  readonly listViewMode: IngestHubDemoStreamsListViewMode;
  readonly onListViewModeChange: (mode: IngestHubDemoStreamsListViewMode) => void;
  /** When false, the toolbar has no bottom border (canvas); table view uses true. */
  readonly showToolbarBottomDivider: boolean;
  /**
   * When true, the toolbar is rendered inside a parent card: no outer background or
   * horizontal rules so the card provides the chrome.
   */
  readonly embedInCard?: boolean;
  /**
   * `pageHeader`: sits in the app chrome — transparent shell and no forced SuperDatePicker
   * control heights (avoids a cramped / “broken” calendar row next to compact controls).
   */
  readonly layout?: IngestHubDemoStreamsDemoToolbarLayout;
}

export function IngestHubDemoStreamsDemoToolbar({
  listViewMode,
  onListViewModeChange,
  showToolbarBottomDivider,
  embedInCard = false,
  layout = 'default',
}: IngestHubDemoStreamsDemoToolbarProps) {
  const { euiTheme } = useEuiTheme();
  const { refresh } = useTimefilter();
  const isChromelessShell = embedInCard || layout === 'pageHeader';

  const datePickerHeightOverrideCss = useMemo(() => {
    if (layout === 'pageHeader') {
      return css``;
    }
    const h = euiTheme.size.xl;
    return css`
      &
        .streamsIngestHubDemoToolbar-dateSlot
        [data-test-subj='globalQueryBar']
        .kbnQueryBar__datePickerWrapper
        .euiFormControlLayout,
      &
        .streamsIngestHubDemoToolbar-dateSlot
        [data-test-subj='globalQueryBar']
        .kbnQueryBar__datePicker
        .euiFormControlLayout {
        block-size: ${h} !important;
        min-block-size: ${h} !important;
        max-block-size: ${h} !important;
      }

      &
        .streamsIngestHubDemoToolbar-dateSlot
        [data-test-subj='globalQueryBar']
        .kbnQueryBar__datePicker
        button,
      &
        .streamsIngestHubDemoToolbar-dateSlot
        [data-test-subj='globalQueryBar']
        .kbnQueryBar__datePickerWrapper
        button.euiButtonIcon {
        block-size: ${h} !important;
        min-block-size: ${h} !important;
        max-block-size: ${h} !important;
      }

      & .streamsIngestHubDemoToolbar-refresh {
        block-size: ${h} !important;
        min-block-size: ${h} !important;
        max-block-size: ${h} !important;
      }
    `;
  }, [euiTheme, layout]);

  const utilitiesRowCss = useMemo(() => {
    const clusterGap = euiTheme.size.s;

    if (layout === 'pageHeader') {
      return css`
        align-items: center;
        gap: ${clusterGap};
        min-inline-size: 0;
        max-inline-size: 100%;

        /*
         * Date slot: Kibana QueryBarTopRow sets justify-content: flexEnd on .kbnQueryBar, which
         * pushes the SuperDatePicker to the trailing edge of whatever width the slot gets — in a
         * page header that reads as a huge gap after the view toggle and odd vertical rhythm.
         */
        & .streamsIngestHubDemoToolbar-dateSlot {
          display: flex;
          min-inline-size: 0;
          flex: 0 1 auto;
          max-inline-size: min(22rem, 46vw);
        }

        & .streamsIngestHubDemoToolbar-dateSlot [data-test-subj='globalQueryBar'] .kbnQueryBar {
          justify-content: flex-start !important;
          flex-wrap: nowrap !important;
          min-inline-size: 0;
          max-inline-size: 100%;
        }

        & .streamsIngestHubDemoToolbar-dateSlot [data-test-subj='globalQueryBar'] {
          min-inline-size: 0;
          flex-shrink: 1;
        }

        &
          .streamsIngestHubDemoToolbar-dateSlot
          .kbnQueryBar__datePickerWrapper
          .euiFormControlLayout,
        & .streamsIngestHubDemoToolbar-dateSlot .kbnQueryBar__datePicker .euiFormControlLayout {
          align-items: center;
        }

        &
          .streamsIngestHubDemoToolbar-dateSlot
          .kbnQueryBar__datePicker
          .euiFormControlLayout__childrenWrapper {
          align-items: center;
        }

        & .streamsIngestHubDemoToolbar-dateSlot [data-test-subj='superDatePickerShowDatesButton'] {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `;
    }
    return css`
      align-items: center;
      gap: ${clusterGap};
      ${datePickerHeightOverrideCss}
    `;
  }, [datePickerHeightOverrideCss, euiTheme, layout]);

  const viewModeLegend = i18n.translate('xpack.streams.ingestHubDemoToolbar.viewModeLegend', {
    defaultMessage: 'Table or canvas layout',
  });

  const viewModeOptions = useMemo(
    () => [
      {
        id: 'table' as const,
        label: i18n.translate('xpack.streams.ingestHubDemoToolbar.tableView', {
          defaultMessage: 'Table view',
        }),
        iconType: 'visTable' as const,
        'data-test-subj': 'streamsAllStreamsMockViewModeTable',
      },
      {
        id: 'canvas' as const,
        label: i18n.translate('xpack.streams.ingestHubDemoToolbar.canvasView', {
          defaultMessage: 'Canvas view',
        }),
        iconType: 'graphApp' as const,
        'data-test-subj': 'streamsAllStreamsMockViewModeCanvas',
      },
    ],
    []
  );

  const toolbarShellCss = useMemo(() => {
    if (isChromelessShell) {
      return css`
        padding: 0;
        border: none;
        background: transparent;
      `;
    }
    const bottomBorder = showToolbarBottomDivider
      ? `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`
      : 'none';
    return css`
      padding-top: 0;
      padding-bottom: ${euiTheme.size.s};
      padding-inline: 0;
      border-bottom: ${bottomBorder};
      background: ${euiTheme.colors.emptyShade};
    `;
  }, [euiTheme, isChromelessShell, showToolbarBottomDivider]);

  const utilitiesOnlyShellCss = useMemo(
    () => css`
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      min-inline-size: 0;
    `,
    []
  );

  const refreshLabel = i18n.translate('xpack.streams.ingestHubDemoToolbar.refresh', {
    defaultMessage: 'Refresh',
  });

  return (
    <div
      className={`${toolbarShellCss} ${utilitiesOnlyShellCss}`}
      data-test-subj="streamsIngestHubDemoStreamsToolbar"
    >
      <EuiFlexGroup
        alignItems="center"
        gutterSize="none"
        responsive={false}
        wrap={false}
        className={utilitiesRowCss}
        data-test-subj="streamsIngestHubDemoToolbarUtilitiesRow"
      >
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={viewModeLegend}
            options={viewModeOptions}
            idSelected={listViewMode}
            onChange={(id) => onListViewModeChange(id as IngestHubDemoStreamsListViewMode)}
            buttonSize="compressed"
            color="text"
            isIconOnly
            data-test-subj="streamsAllStreamsMockViewModeToggle"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div className="streamsIngestHubDemoToolbar-dateSlot">
            <StreamsAppSearchBar
              showDatePicker
              showSubmitButton={false}
              showTimeWindowButtons={false}
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            className="streamsIngestHubDemoToolbar-refresh"
            display="base"
            color="primary"
            size="s"
            iconType="refresh"
            aria-label={refreshLabel}
            data-test-subj="streamsIngestHubDemoToolbarRefresh"
            onClick={() => refresh()}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
