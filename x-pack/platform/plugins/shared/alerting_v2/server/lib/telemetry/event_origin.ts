/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';
import type { EventOrigin } from '../event_origin/origin_schemas';

/** EBT schema fragment for the `origin` property shared by every change-telemetry event. */
export const eventOriginEbtSchema: NonNullable<
  EventTypeOpts<{ origin: EventOrigin }>['schema']['origin']
> = {
  properties: {
    actor: {
      type: 'keyword',
      _meta: {
        description:
          'Who made the change: `user` for a request carrying credentials, or `internal` for the Kibana internal user acting on its own.',
        optional: false,
      },
    },
    channel: {
      type: 'keyword',
      _meta: {
        description:
          'The channel the change was made through: `ui` for requests made by the Kibana browser app, `system` for Kibana acting on its own behalf, or `api` for any other request.',
        optional: false,
      },
    },
    app: {
      type: 'keyword',
      _meta: {
        description:
          'The app the change was made from: the app configured by the calling plugin or, for `ui` requests, the app named in the execution context. Absent otherwise.',
        optional: true,
      },
    },
  },
  _meta: {
    description: 'Where the change came from.',
    optional: false,
  },
};
