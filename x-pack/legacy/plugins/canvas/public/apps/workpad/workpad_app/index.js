/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, branch, renderComponent } from 'recompose';
import { selectToplevelNodes } from '../../../state/actions/transient';
import { canUserWrite, getAppReady } from '../../../state/selectors/app';
import { getWorkpad, isWriteable } from '../../../state/selectors/workpad';
import { LoadWorkpad } from './load_workpad';
import { WorkpadApp as Component } from './workpad_app';
import { withElementsLoadedTelemetry } from './workpad_telemetry';

export { WORKPAD_CONTAINER_ID } from './workpad_app';

const mapStateToProps = state => {
  const appReady = getAppReady(state);

  return {
    isWriteable: isWriteable(state) && canUserWrite(state),
    appReady: typeof appReady === 'object' ? appReady : { ready: appReady },
    workpad: getWorkpad(state),
  };
};

const mapDispatchToProps = dispatch => ({
  deselectElement(ev) {
    ev && ev.stopPropagation();
    dispatch(selectToplevelNodes([]));
  },
});

const branches = [branch(({ workpad }) => workpad == null, renderComponent(LoadWorkpad))];

export const WorkpadApp = compose(
  connect(mapStateToProps, mapDispatchToProps),
  ...branches,
  withElementsLoadedTelemetry
)(Component);
