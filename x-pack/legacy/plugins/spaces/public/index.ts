/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SpacesPlugin } from './plugin';

export { SpaceAvatar } from './space_avatar';

export const plugin = () => {
  return new SpacesPlugin();
};
