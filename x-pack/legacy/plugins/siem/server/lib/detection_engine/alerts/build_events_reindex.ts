/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

// TODO: Re-index is just a temporary solution in order to speed up development
// of any front end pieces. This should be replaced with a combination of the file
// build_events_query.ts and any scrolling/scaling solutions from that particular
// file.

interface BuildEventsReIndexParams {
  description: string;
  index: string[];
  from: string;
  to: string;
  signalsIndex: string;
  maxDocs: string;
  filter: Record<string, {}> | undefined;
  kql: string | undefined;
  severity: number;
  name: string;
  timeDetected: number;
  ruleRevision: number;
  id: string;
  type: string;
  references: string[];
}

export const getFilter = (kql: string | undefined, filter: Record<string, {}> | undefined) => {
  if (kql != null) {
    return toElasticsearchQuery(fromKueryExpression(kql), null);
  } else if (filter != null) {
    return filter;
  } else {
    // TODO: Re-visit this error (which should never happen) when we do signal errors for the UI
    throw new TypeError('either kql or filter should be set');
  }
};

export const buildEventsReIndex = ({
  description,
  index,
  from,
  to,
  signalsIndex,
  maxDocs,
  filter,
  kql,
  severity,
  name,
  timeDetected,
  ruleRevision,
  id,
  type,
  references,
}: BuildEventsReIndexParams) => {
  const kqlOrFilter = getFilter(kql, filter);
  const indexPatterns = index.map(element => `"${element}"`).join(',');
  const refs = references.map(element => `"${element}"`).join(',');
  const filterWithTime = [
    kqlOrFilter,
    {
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  range: {
                    '@timestamp': {
                      gte: from,
                    },
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          {
            bool: {
              should: [
                {
                  range: {
                    '@timestamp': {
                      lte: to,
                    },
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
  ];
  return {
    body: {
      source: {
        index,
        sort: [
          {
            '@timestamp': 'desc',
          },
          {
            _doc: 'desc',
          },
        ],
        query: {
          bool: {
            filter: [
              ...filterWithTime,
              {
                match_all: {},
              },
            ],
          },
        },
      },
      dest: {
        index: signalsIndex,
      },
      script: {
        source: `
          String[] indexPatterns = new String[] {${indexPatterns}};
          String[] references = new String[] {${refs}};

          def parent = [
            "id": ctx._id,
            "type": "event",
            "depth": 1
          ];

          def signal = [
            "rule_revision": "${ruleRevision}",
            "rule_id": "${id}",
            "rule_type": "${type}",
            "parent": parent,
            "name": "${name}",
            "severity": ${severity},
            "description": "${description}",
            "time_detected": "${timeDetected}",
            "index_patterns": indexPatterns,
            "references": references
          ];

          ctx._source.signal = signal;
        `,
        lang: 'painless',
      },
      max_docs: maxDocs,
    },
  };
};
