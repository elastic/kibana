/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CapabilityDoc } from '@kbn/custom-app-registry';

/** What an agent is told about custom content, which an app holds as an embeddable. */
export const CUSTOM_CONTENT_EMBEDDABLE_DOC: CapabilityDoc = {
  summary:
    'your own HTML layout (a status board, KPI cards, a styled list) filled with the rows of its ES|QL query. NEVER write the HTML yourself: put what you want in "prompt", inside "state", and the server writes the template, and the height of the node, with the real columns of the query in front of it. The state is { "esql_query"?: ["<an ES|QL query>"], "template"?: "...", "prompt"?: "..." }. To change one that exists, keep its "template" as it is and add a "prompt" with only the change; to keep it as it is, leave "prompt" out. The query can read the values of the app as ?name. It is only to be looked at: it cannot be pressed or changed by the person, and cannot hold other components.',
  whenToUse:
    'For what is only to be looked at and has a layout of its own: a banner or cover at the top of a page, a styled quote, a status board, a gallery of KPI cards, a custom legend. For anything people interact with, use the native components next to it.',
  example: {
    type: 'embeddable',
    id: 'banner',
    embeddableType: 'custom_content',
    state: {
      esql_query: ['FROM logs-* | STATS errors = COUNT(*)'],
      prompt: 'A banner with the number of errors',
    },
  },
};
