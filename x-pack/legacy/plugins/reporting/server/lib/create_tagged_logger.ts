/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerFacade } from '../../types';

/**
 * @function taggedLogger
 * @param {string} message
 * @param {string[]} [additionalTags]
 */

/**
 * Creates a taggedLogger function with tags, allows the consumer to optionally provide additional tags
 *
 * @param {Server} server
 * @param {string[]} tags - tags to always be passed into the `logger` function
 * @returns taggedLogger
 */
export function createTaggedLogger(server: ServerFacade, tags: string[]) {
  return (msg: string, additionalTags = []) => {
    server.log([...tags, ...additionalTags], msg);
  };
}
