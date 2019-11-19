/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PLUGIN } from '../common/constants';
import { Feature } from '../../../../plugins/features/server';

export const feature: Feature = {
  id: PLUGIN.ID,
  name: PLUGIN.TITLE,
  icon: PLUGIN.ICON,
  navLinkId: PLUGIN.ID,
  app: [PLUGIN.ID, 'kibana'],
  catalogue: [PLUGIN.ID],
  privileges: {
    all: {
      api: [PLUGIN.ID],
      catalogue: [PLUGIN.ID],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show', 'save'],
    },
    read: {
      api: [PLUGIN.ID],
      catalogue: [PLUGIN.ID],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
    },
  },
};
