/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import * as argHelper from '../../lib/resolved_arg';
import { prepend } from '../../lib/modify_path';

export function getArgs(state) {
  return get(state, ['transient', 'resolvedArgs']);
}

export function getArg(state, path) {
  return get(state, prepend(path, ['transient', 'resolvedArgs']));
}

export function getValue(state, path) {
  return argHelper.getValue(getArg(state, path));
}

export function getState(state, path) {
  return argHelper.getState(getArg(state, path));
}

export function getError(state, path) {
  return argHelper.getError(getArg(state, path));
}

export function getInFlight(state) {
  return get(state, ['transient', 'inFlight'], false);
}
