/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { inputsModel, inputsSelectors, State, timelineSelectors } from '../../store';
import { timelineActions, inputsActions } from '../../store/actions';
import { TimelineModel } from '../../store/timeline/model';
import { DEFAULT_SIGNALS_INDEX } from '../../../common/constants';

import { StatefulEventsViewer } from '../events_viewer';
import * as i18n from './translations';
import { alertsDefaultModel } from './default_headers';

export interface OwnProps {
  end: number;
  id: string;
  start: number;
}

const ALERTS_TABLE_ID = 'timeline-alerts-table';

const StatefulAlertsViewerComponent = React.memo(({ end, start }) => {
  return (
    <StatefulEventsViewer
      defaultIndices={[DEFAULT_SIGNALS_INDEX]}
      defaultModel={alertsDefaultModel}
      end={end}
      id={ALERTS_TABLE_ID}
      start={start}
      timelineTypeContext={{
        documentType: i18n.ALERTS,
        footerText: i18n.ALERTS,
        showCheckboxes: false,
        showRowRenderers: false,
        title: i18n.ALERTS,
      }}
    />
  );
});

StatefulAlertsViewerComponent.displayName = 'StatefulAlertsViewerComponent';

const makeMapStateToProps = () => {
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const getAlerts = timelineSelectors.getAlertsByIdSelector();
  const mapStateToProps = (state: State, { id }: OwnProps) => {
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const alerts: TimelineModel = getAlerts(state, id);
    const { columns, dataProviders, itemsPerPage, itemsPerPageOptions, kqlMode, sort } = alerts;

    return {
      columns,
      dataProviders,
      filters: getGlobalFiltersQuerySelector(state),
      id,
      isLive: input.policy.kind === 'interval',
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      query: getGlobalQuerySelector(state),
      sort,
    };
  };
  return mapStateToProps;
};

export const StatefulAlertsViewer = connect(makeMapStateToProps, {
  createTimeline: timelineActions.createTimeline,
  deleteEventQuery: inputsActions.deleteOneQuery,
  updateItemsPerPage: timelineActions.updateItemsPerPage,
  updateSort: timelineActions.updateSort,
  removeColumn: timelineActions.removeColumn,
  upsertColumn: timelineActions.upsertColumn,
})(StatefulAlertsViewerComponent);
