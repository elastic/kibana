/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
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

WorkpadShortcuts.propTypes = {
  pageId: PropTypes.string.isRequired,
  // @ts-expect-error upgrade typescript v5.9.3
  selectedNodes: PropTypes.arrayOf(PropTypes.object),
  elementLayer: PropTypes.func.isRequired,
  insertNodes: PropTypes.func.isRequired,
  removeNodes: PropTypes.func.isRequired,
  selectToplevelNodes: PropTypes.func.isRequired,
  commit: PropTypes.func.isRequired,
};
