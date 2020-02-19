/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { AppState } from '../../../state';
import { setAlertFlyoutVisible } from '../../../state/actions';
import { UptimeAlertsContextProvider } from '../../functional/uptime_alerts_context_provider';
import { ToggleAlertFlyoutButton } from '../../functional/toggle_alert_flyout_button';

interface OwnProps {
  children: any;
}

interface StateProps {
  addFlyoutVisible: boolean;
}

interface DispatchProps {
  setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

const mapStateToProps = (state: AppState): StateProps => ({
  addFlyoutVisible: state.ui.alertFlyoutVisible,
});

const mapDispatchToProps = (dispatch: any): DispatchProps => ({
  // @ts-ignore the value here is a boolean, and it works with the
  // action creator function
  setAddFlyoutVisibility: value => dispatch(setAlertFlyoutVisible(value)),
});

export const UptimeAlertContextContainer = connect<StateProps, DispatchProps, OwnProps, AppState>(
  mapStateToProps,
  mapDispatchToProps
)(UptimeAlertsContextProvider);

export const ToggleAlertButton = connect<StateProps, DispatchProps, {}, AppState>(
  mapStateToProps,
  mapDispatchToProps
)(ToggleAlertFlyoutButton);
