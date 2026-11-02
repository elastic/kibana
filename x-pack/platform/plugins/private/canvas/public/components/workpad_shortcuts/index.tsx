/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withHandlers, compose } from 'react-recompose';
import type { Props as WorkpadShortcutsProps } from './workpad_shortcuts';
import { WorkpadShortcuts as Component } from './workpad_shortcuts';
import type { Props as HandlerCreatorProps } from '../../lib/element_handler_creators';
import {
  groupHandlerCreators,
  layerHandlerCreators,
  basicHandlerCreators,
  clipboardHandlerCreators,
  positionHandlerCreators,
} from '../../lib/element_handler_creators';

export const WorkpadShortcuts = compose<WorkpadShortcutsProps, HandlerCreatorProps>(
  withHandlers(groupHandlerCreators),
  withHandlers(layerHandlerCreators),
  withHandlers(basicHandlerCreators),
  withHandlers(clipboardHandlerCreators),
  withHandlers(positionHandlerCreators)
)(Component);
