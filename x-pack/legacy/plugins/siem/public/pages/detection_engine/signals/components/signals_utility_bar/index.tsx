/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiContextMenuPanel } from '@elastic/eui';
import numeral from '@elastic/numeral';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../../components/detection_engine/utility_bar';
import * as i18n from './translations';
import { getBatchItems } from './batch_actions';
import { useKibanaUiSetting } from '../../../../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_NUMBER_FORMAT } from '../../../../../../common/constants';
import { TimelineNonEcsData } from '../../../../../graphql/types';
import { SendSignalsToTimeline, UpdateSignalsStatus } from '../../types';

interface SignalsUtilityBarProps {
  areEventsLoading: boolean;
  clearSelection: () => void;
  isFilteredToOpen: boolean;
  selectAll: () => void;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  sendSignalsToTimeline: SendSignalsToTimeline;
  showClearSelection: boolean;
  totalCount: number;
  updateSignalsStatus: UpdateSignalsStatus;
}

export const SignalsUtilityBar = React.memo<SignalsUtilityBarProps>(
  ({
    areEventsLoading,
    clearSelection,
    totalCount,
    selectedEventIds,
    isFilteredToOpen,
    selectAll,
    showClearSelection,
    updateSignalsStatus,
    sendSignalsToTimeline,
  }) => {
    const [defaultNumberFormat] = useKibanaUiSetting(DEFAULT_NUMBER_FORMAT);

    const getBatchItemsPopoverContent = useCallback(
      (closePopover: () => void) => (
        <EuiContextMenuPanel
          items={getBatchItems(
            areEventsLoading,
            showClearSelection,
            selectedEventIds,
            updateSignalsStatus,
            sendSignalsToTimeline,
            closePopover,
            isFilteredToOpen
          )}
        />
      ),
      [
        areEventsLoading,
        selectedEventIds,
        updateSignalsStatus,
        sendSignalsToTimeline,
        isFilteredToOpen,
      ]
    );

    const formattedTotalCount = numeral(totalCount).format(defaultNumberFormat);
    const formattedSelectedEventsCount = numeral(Object.keys(selectedEventIds).length).format(
      defaultNumberFormat
    );

    return (
      <>
        <UtilityBar>
          <UtilityBarSection>
            <UtilityBarGroup>
              <UtilityBarText>
                {i18n.SHOWING_SIGNALS(formattedTotalCount, totalCount)}
              </UtilityBarText>
            </UtilityBarGroup>

            <UtilityBarGroup>
              {totalCount > 0 && (
                <>
                  <UtilityBarText>
                    {i18n.SELECTED_SIGNALS(
                      showClearSelection ? formattedTotalCount : formattedSelectedEventsCount,
                      showClearSelection ? totalCount : Object.keys(selectedEventIds).length
                    )}
                  </UtilityBarText>

                  <UtilityBarAction
                    iconSide="right"
                    iconType="arrowDown"
                    popoverContent={getBatchItemsPopoverContent}
                  >
                    {i18n.BATCH_ACTIONS}
                  </UtilityBarAction>

                  <UtilityBarAction
                    iconType="listAdd"
                    onClick={() => {
                      if (!showClearSelection) {
                        selectAll();
                      } else {
                        clearSelection();
                      }
                    }}
                  >
                    {showClearSelection
                      ? i18n.CLEAR_SELECTION
                      : i18n.SELECT_ALL_SIGNALS(formattedTotalCount, totalCount)}
                  </UtilityBarAction>
                </>
              )}
            </UtilityBarGroup>
          </UtilityBarSection>
        </UtilityBar>
      </>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.selectedEventIds === nextProps.selectedEventIds &&
      prevProps.totalCount === nextProps.totalCount &&
      prevProps.showClearSelection === nextProps.showClearSelection
    );
  }
);
