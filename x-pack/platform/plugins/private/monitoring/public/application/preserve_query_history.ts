/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History, LocationDescriptor, LocationDescriptorObject } from 'history';
import { createHashHistory } from 'history';

function preserveQueryParameters(
  history: History,
  location: LocationDescriptorObject
): LocationDescriptorObject {
  location.search = history.location.search;
  return location;
}

function createLocationDescriptorObject(
  location: LocationDescriptor,
  state?: History.LocationState
): LocationDescriptorObject {
  return typeof location === 'string' ? { pathname: location, state } : location;
}

export function createPreserveQueryHistory() {
  const history = createHashHistory({ hashType: 'slash' });
  const oldPush = history.push;
  const oldReplace = history.replace;
  history.push = (path: LocationDescriptor, state?: History.LocationState) =>
    oldPush.apply(history, [
      preserveQueryParameters(history, createLocationDescriptorObject(path, state)),
    ]);
  history.replace = (path: LocationDescriptor, state?: History.LocationState) =>
    oldReplace.apply(history, [
      preserveQueryParameters(history, createLocationDescriptorObject(path, state)),
    ]);
  return history;
}
