/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiText, EuiToolTip } from '@elastic/eui';
import { AlertPanel } from '../panel';
import type {
  CommonAlertStatus,
  CommonAlertState,
  CommonAlert,
  AlertState,
} from '../../../common/types/alerts';
import { getDateFromNow, getCalendar } from '../../../common/formatting';
import type { PanelItem } from '../types';
import { sortByNewestAlert } from './sort_by_newest_alert';
import { Legacy } from '../../legacy_shims';

export function getAlertPanelsByNode(
  panelTitle: string,
  alerts: CommonAlertStatus[],
  stateFilter: (state: AlertState) => boolean
) {
  const alertsByNodes: {
    [uuid: string]: {
      [alertName: string]: {
        alert: CommonAlert;
        states: CommonAlertState[];
        count: number;
      };
    };
  } = {};
  const statesByNodes: {
    [uuid: string]: CommonAlertState[];
  } = {};

  for (const { states, sanitizedRule } of alerts) {
    const { id: alertId } = sanitizedRule;
    for (const alertState of states.filter(({ state: _state }) => stateFilter(_state))) {
      const { state } = alertState;
      statesByNodes[state.nodeId] = statesByNodes[state.nodeId] || [];
      statesByNodes[state.nodeId].push(alertState);

      alertsByNodes[state.nodeId] = alertsByNodes[state.nodeId] || {};
      alertsByNodes[state.nodeId][alertId] = alertsByNodes[alertState.state.nodeId][alertId] || {
        alert: sanitizedRule,
        states: [],
        count: 0,
      };
      alertsByNodes[state.nodeId][alertId].count++;
      alertsByNodes[state.nodeId][alertId].states.push(alertState);
    }
  }

  for (const types of Object.values(alertsByNodes)) {
    for (const { states } of Object.values(types)) {
      states.sort(sortByNewestAlert);
    }
  }

  const nodeCount = Object.keys(statesByNodes).length;
  let secondaryPanelIndex = nodeCount;
  let tertiaryPanelIndex = nodeCount;
  const panels: PanelItem[] = [
    {
      id: 0,
      title: panelTitle,
      items: [
        ...Object.keys(statesByNodes).map((nodeUuid, index) => {
          const states = (statesByNodes[nodeUuid] as CommonAlertState[]).filter(({ state }) =>
            stateFilter(state)
          );
          const { nodeName, itemLabel } = states[0].state;
          return {
            name: (
              <EuiText>
                {nodeName || itemLabel} ({states.length})
              </EuiText>
            ),
            panel: index + 1,
          };
        }),
      ],
    },
    ...Object.keys(statesByNodes).reduce((accum: PanelItem[], nodeUuid, nodeIndex) => {
      const alertsForNode = Object.values(alertsByNodes[nodeUuid]);
      const panelItems = [];
      let title = '';
      for (const { alert, states } of alertsForNode) {
        for (const alertState of states) {
          const { nodeName, itemLabel } = alertState.state;
          title = nodeName || itemLabel;
          panelItems.push({
            name: (
              <Fragment>
                <EuiToolTip
                  position="top"
                  content={getCalendar(
                    alertState.state.ui.triggeredMS,
                    Legacy.shims.uiSettings.get('dateFormat:tz')
                  )}
                >
                  <EuiText size="s" tabIndex={0}>
                    {getDateFromNow(
                      alertState.state.ui.triggeredMS,
                      Legacy.shims.uiSettings.get('dateFormat:tz')
                    )}
                  </EuiText>
                </EuiToolTip>
                <EuiText size="s">{alert.name}</EuiText>
              </Fragment>
            ),
            panel: ++secondaryPanelIndex,
          });
        }
      }
      accum.push({
        id: nodeIndex + 1,
        title,
        items: panelItems,
      });
      return accum;
    }, []),
    ...Object.keys(statesByNodes).reduce((accum: PanelItem[], nodeUuid, nodeIndex) => {
      const alertsForNode = Object.values(alertsByNodes[nodeUuid]);
      for (const { alert, states } of alertsForNode) {
        for (const alertState of states) {
          accum.push({
            id: ++tertiaryPanelIndex,
            title: alert.name,
            width: 400,
            content: <AlertPanel alert={alert} alertState={alertState} />,
          });
        }
      }
      return accum;
    }, []),
  ];
  return panels;
}
