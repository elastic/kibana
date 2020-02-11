/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, FC } from 'react';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { merge } from 'rxjs';
import { map } from 'rxjs/operators';

import { CoreStart } from '../../plugin';
import { uiSettingsActions as actions, uiSettingsModel as model } from '../../store/ui_settings';

export interface Props {
  client: CoreStart['uiSettings'];
  children: JSX.Element;
}
export interface ReduxProps {
  dispatch: Dispatch;
}

export const PureUISettingsStoreObserver: FC<Props & ReduxProps> = ({
  client,
  children,
  dispatch,
}) => {
  useEffect(() => {
    const subscription = merge(
      client
        .get$<model.State['anomalyThreshold']>(model.keys.anomalyThreshold)
        .pipe(map(value => actions.anomalyThresholdChanged(value))),
      client
        .get$<model.State['bytesFormat']>(model.keys.bytesFormat)
        .pipe(map(value => actions.bytesFormatChanged(value))),
      client
        .get$<model.State['darkMode']>(model.keys.darkMode)
        .pipe(map(value => actions.darkModeChanged(value))),
      client
        .get$<model.State['dateFormat']>(model.keys.dateFormat)
        .pipe(map(value => actions.dateFormatChanged(value))),
      client
        .get$<model.State['indexPattern']>(model.keys.indexPattern)
        .pipe(map(value => actions.indexPatternChanged(value))),
      client
        .get$<model.State['newsFeedEnabled']>(model.keys.newsFeedEnabled)
        .pipe(map(value => actions.newsFeedEnabledChanged(value))),
      client
        .get$<model.State['newsFeedUrl']>(model.keys.newsFeedUrl)
        .pipe(map(value => actions.newsFeedUrlChanged(value))),
      client
        .get$<model.State['numberFormat']>(model.keys.numberFormat)
        .pipe(map(value => actions.numberFormatChanged(value))),
      client
        .get$<model.State['timeFilterQuickRanges']>(model.keys.timeFilterQuickRanges)
        .pipe(map(value => actions.timeFilterQuickRangesChanged(value))),
      client
        .get$<model.State['timeFilterRange']>(model.keys.timeFilterRange)
        .pipe(map(value => actions.timeFilterRangeChanged(value))),
      client
        .get$<model.State['timeFilterRefreshInterval']>(model.keys.timeFilterRefreshInterval)
        .pipe(map(value => actions.timeFilterRefreshIntervalChanged(value))),
      client
        .get$<model.State['timeZone']>(model.keys.timeZone)
        .pipe(map(value => actions.timeZoneChanged(value)))
      // @ts-ignore-next-line merge is only typed up to six arguments
    ).subscribe(dispatch);

    return () => subscription.unsubscribe();
  }, [client]);

  return children;
};

export const UISettingsStoreObserver = connect()(PureUISettingsStoreObserver);
