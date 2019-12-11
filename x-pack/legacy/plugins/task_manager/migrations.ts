/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'src/core/server';

export const migrations = {
  task: {
    '7.4.0': (doc: SavedObject) => ({
      ...doc,
      updated_at: new Date().toISOString(),
    }),
    '7.6.0': renameAttribute('interval', 'recurringSchedule'),
  },
};

function renameAttribute(oldName: string, newName: string) {
  return ({ attributes: { [oldName]: value, ...attributes }, ...doc }: SavedObject) => ({
    ...doc,
    attributes: {
      ...attributes,
      [newName]: value,
    },
  });
}
