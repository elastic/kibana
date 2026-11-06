/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  readEsqlQuery,
  type CustomContentState,
} from '@kbn/custom-content-common';
import type { GenericNode } from '@kbn/custom-app-registry';

/** An app as it is sent to be saved, which checks it against the components it knows. */
export interface NewAppDocument {
  state: Record<string, never>;
  root: GenericNode;
}

/** The names a query uses for the period of a dashboard, which an app has when it has a period. */
const USES_PERIOD = /\?_t(?:start|end)\b/;

/**
 * The app that a custom content panel is: its template and its query, as the state of the one
 * embeddable of an app, which is the same panel. A query that uses the period gets the control of the period, as
 * the panel got it from the dashboard. It throws, with what is wrong, when the panel has no
 * template yet or what it holds is not something an app can.
 */
export const customContentToDocument = (state: CustomContentState): NewAppDocument => {
  if (!state.template) throw new Error('This panel has no content yet.');
  const query = readEsqlQuery(state);

  return {
    state: {},
    root: {
      type: 'stack',
      id: 'root',
      direction: 'vertical',
      children: [
        ...(query !== undefined && USES_PERIOD.test(query)
          ? [
              {
                type: 'stack',
                id: 'filters',
                direction: 'horizontal',
                children: [{ type: 'time_range', id: 'period' }],
              },
            ]
          : []),
        {
          type: 'embeddable',
          id: 'content',
          embeddableType: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          state: {
            ...(state.esql_query === undefined ? {} : { esql_query: state.esql_query }),
            template: state.template,
          },
        },
      ],
    },
  };
};
