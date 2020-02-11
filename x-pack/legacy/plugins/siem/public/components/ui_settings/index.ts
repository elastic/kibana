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
        .get$<model.State['indexPattern']>(model.keys.indexPattern)
        .pipe(map(value => actions.indexPatternChanged(value))),
      client
        .get$<model.State['dateFormat']>(model.keys.dateFormat)
        .pipe(map(value => actions.dateFormatChanged(value)))
    ).subscribe(dispatch);

    return () => subscription.unsubscribe();
  }, [client]);

  return children;
};

export const UISettingsStoreObserver = connect()(PureUISettingsStoreObserver);
