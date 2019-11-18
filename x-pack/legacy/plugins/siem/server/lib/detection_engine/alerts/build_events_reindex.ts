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
  description: string;
  index: string[];
  from: string;
  to: string;
  signalsIndex: string;
  maxDocs: number;
  filter: unknown;
  severity: string;
  name: string;
  timeDetected: string;
  ruleRevision: number;
  id: string;
  ruleId: string | undefined | null;
  type: string;
  references: string[];
}

export const buildEventsReIndex = ({
  description,
  index,
  from,
  to,
  signalsIndex,
  maxDocs,
  filter,
  severity,
  name,
  timeDetected,
  ruleRevision,
  id,
  ruleId,
  type,
  references,
}: BuildEventsReIndexParams) => {
  const indexPatterns = index.map(element => `"${element}"`).join(',');
  const refs = references.map(element => `"${element}"`).join(',');
  const filterWithTime = [
    filter,
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
            "index": ctx._index,
            "depth": 1
          ];

          def signal = [
            "id": "${id}",
            "rule_revision": "${ruleRevision}",
            "rule_id": "${ruleId}",
            "rule_type": "${type}",
            "parent": parent,
            "name": "${name}",
            "severity": "${severity}",
            "description": "${description}",
            "original_time": ctx._source['@timestamp'],
            "index_patterns": indexPatterns,
            "references": references
          ];

          ctx._source.signal = signal;
          ctx._source['@timestamp'] = "${timeDetected}";
        `,
        lang: 'painless',
      },
      max_docs: maxDocs,
    },
  };
};
