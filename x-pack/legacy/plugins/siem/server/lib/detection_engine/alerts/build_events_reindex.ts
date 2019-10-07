/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Re-index is just a temporary solution in order to speed up development
// of any front end pieces. This should be replaced with a combination of the file
// build_events_query.ts and any scrolling/scaling solutions from that particular
// file.

interface BuildEventsReIndexParams {
  index: string[];
  from: number;
  to: number;
  signalsIndex: string;
  maxDocs: number;
  kqlFilter: {};
  severity: number;
  description: string;
  name: string;
  timeDetected: number;
  ruleRevision: number;
  ruleId: string;
  ruleType: string;
  references: string[];
}

export const buildEventsReIndex = ({
  index,
  from,
  to,
  signalsIndex,
  maxDocs,
  kqlFilter,
  severity,
  description,
  name,
  timeDetected,
  ruleRevision,
  ruleId,
  ruleType,
  references,
}: BuildEventsReIndexParams) => {
  const indexPatterns = index.map(element => `"${element}"`).join(',');
  const refs = references.map(element => `"${element}"`).join(',');
  const filter = [
    kqlFilter,
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
              ...filter,
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
            "rule_id": "${ruleId}",
            "rule_type": "${ruleType}",
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
