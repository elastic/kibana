/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import React, { useCallback } from 'react';
import numeral from '@elastic/numeral';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../../components/detection_engine/utility_bar';
import * as i18n from './translations';
import { useUiSetting$ } from '../../../../../lib/kibana';
import { DEFAULT_NUMBER_FORMAT } from '../../../../../../common/constants';
import { TimelineNonEcsData } from '../../../../../graphql/types';
import { UpdateSignalsStatus } from '../types';
import { FILTER_CLOSED, FILTER_OPEN } from '../signals_filter_group';

interface SignalsUtilityBarProps {
  canUserCRUD: boolean;
  hasIndexWrite: boolean;
  areEventsLoading: boolean;
  clearSelection: () => void;
  isFilteredToOpen: boolean;
  selectAll: () => void;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showClearSelection: boolean;
  totalCount: number;
  updateSignalsStatus: UpdateSignalsStatus;
}

const SignalsUtilityBarComponent: React.FC<SignalsUtilityBarProps> = ({
  canUserCRUD,
  hasIndexWrite,
  areEventsLoading,
  clearSelection,
  totalCount,
  selectedEventIds,
  isFilteredToOpen,
  selectAll,
  showClearSelection,
  updateSignalsStatus,
}) => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const handleUpdateStatus = useCallback(async () => {
    await updateSignalsStatus({
      signalIds: Object.keys(selectedEventIds),
      status: isFilteredToOpen ? FILTER_CLOSED : FILTER_OPEN,
    });
  }, [selectedEventIds, updateSignalsStatus, isFilteredToOpen]);

  const formattedTotalCount = numeral(totalCount).format(defaultNumberFormat);
  const formattedSelectedEventsCount = numeral(Object.keys(selectedEventIds).length).format(
    defaultNumberFormat
  );

  return (
    <>
      <UtilityBar>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText>{i18n.SHOWING_SIGNALS(formattedTotalCount, totalCount)}</UtilityBarText>
          </UtilityBarGroup>

          <UtilityBarGroup>
            {canUserCRUD && hasIndexWrite && (
              <>
                <UtilityBarText>
                  {i18n.SELECTED_SIGNALS(
                    showClearSelection ? formattedTotalCount : formattedSelectedEventsCount,
                    showClearSelection ? totalCount : Object.keys(selectedEventIds).length
                  )}
                </UtilityBarText>

                <UtilityBarAction
                  disabled={areEventsLoading || isEmpty(selectedEventIds)}
                  iconType={isFilteredToOpen ? 'securitySignalResolved' : 'securitySignalDetected'}
                  onClick={handleUpdateStatus}
                >
                  {isFilteredToOpen
                    ? i18n.BATCH_ACTION_CLOSE_SELECTED
                    : i18n.BATCH_ACTION_OPEN_SELECTED}
                </UtilityBarAction>

                <UtilityBarAction
                  iconType={showClearSelection ? 'cross' : 'pagesSelect'}
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
};

export const SignalsUtilityBar = React.memo(
  SignalsUtilityBarComponent,
  (prevProps, nextProps) =>
    prevProps.areEventsLoading === nextProps.areEventsLoading &&
    prevProps.selectedEventIds === nextProps.selectedEventIds &&
    prevProps.totalCount === nextProps.totalCount &&
    prevProps.showClearSelection === nextProps.showClearSelection
);
