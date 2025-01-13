/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { canUserWrite } from '../../state/selectors/app';
import { getWorkpad, isWriteable } from '../../state/selectors/workpad';
import { WorkpadApp as Component } from './workpad_app.component';
import { withElementsLoadedTelemetry } from './workpad_telemetry';
import { State } from '../../../types';

export { WORKPAD_CONTAINER_ID } from './workpad_app.component';

const WorkpadAppComponent = withElementsLoadedTelemetry(Component);

export const WorkpadApp = connect((state: State) => ({
  isWriteable: isWriteable(state) && canUserWrite(state),
  workpad: getWorkpad(state),
}))(WorkpadAppComponent);
