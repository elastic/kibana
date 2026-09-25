/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import {
  DEFAULT_AI_INDEX_QUERY_LIMIT,
  DEFAULT_FEEDBACK_ANALYSIS_INTERVAL,
  DEFAULT_FEEDBACK_ANALYSIS_SIGNAL_TIME_RANGE_FROM,
  DEFAULT_KI_PAGE_SIZE,
  MAX_AI_INDEX_AUTOMATION_LENGTH,
  MAX_AI_INDEX_AUTOMATIONS,
  MAX_AI_INDEX_DESCRIPTION_LENGTH,
  MAX_AI_INDEX_DEST_VALUE_LENGTH,
  MAX_AI_INDEX_FEEDBACK_AGENT_ID_LENGTH,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_AI_INDEX_QUERY_LENGTH,
  MAX_AI_INDEX_QUERY_LIMIT,
  MAX_AI_INDEX_QUERY_PARAM_KEY_LENGTH,
  MAX_AI_INDEX_QUERY_PARAM_VALUE_LENGTH,
  MAX_AI_INDEX_QUERY_PARAMS,
  MAX_AI_INDEX_SOURCE_VALUE_LENGTH,
  MAX_AI_INDEX_SOURCES,
  MAX_AI_INDEX_TRACES,
  MAX_AI_INDEX_TRACE_INDEX_EXPRESSIONS,
  MAX_AI_INDEX_TRACE_VALUE_LENGTH,
  MAX_FEEDBACK_ANALYSIS_INTERVAL_LENGTH,
  MAX_FEEDBACK_ANALYSIS_SIGNAL_FILTER_LENGTH,
  MAX_FEEDBACK_ANALYSIS_TIME_RANGE_FROM_LENGTH,
  MAX_INDEX_NAME_BYTES,
  MAX_KI_PAGE_SIZE,
  MAX_KI_TYPE_FILTER_LENGTH,
  MIN_FEEDBACK_ANALYSIS_INTERVAL_MINUTES,
} from '../../../common/constants';
import type { ImprovementAction } from '../../../common/http_api/improvement_actions';
import { IMPROVEMENT_ACTIONS } from '../../../common/http_api/improvement_actions';
import { MAX_KI_ID_LENGTH } from '../../../common/step_types/ki';
import {
  validateAbsoluteSignalWindow,
  validateAiIndexId,
  validateAiIndexQueryLimit,
  validateFeedbackAnalysisInterval,
  validateRelativeSignalWindow,
  validateSignalWindowCoversInterval,
} from '../../../common/validation';
import { validateSignalFilter } from '../../ai_indices/signal_filter';

const aiIndexIdSchema = schema.string({
  minLength: 1,
  maxLength: MAX_AI_INDEX_ID_LENGTH,
  validate: validateAiIndexId,
  meta: { description: 'The unique identifier of the AI Index.' },
});

export const aiIndexIdParamsSchema = schema.object({
  aiIndexId: aiIndexIdSchema,
});

const signalTimeRangeSchema = schema.oneOf(
  [
    schema.object({
      type: schema.literal('relative'),
      from: schema.string({
        maxLength: MAX_FEEDBACK_ANALYSIS_TIME_RANGE_FROM_LENGTH,
        validate: validateRelativeSignalWindow,
        meta: { description: 'Date math relative to now, for example `now-30d`.' },
      }),
    }),
    schema.object({
      type: schema.literal('absolute'),
      from: schema.string({
        maxLength: MAX_FEEDBACK_ANALYSIS_TIME_RANGE_FROM_LENGTH,
        validate: validateAbsoluteSignalWindow,
        meta: { description: 'ISO 8601 date to analyze signals since.' },
      }),
    }),
  ],
  {
    defaultValue: {
      type: 'relative' as const,
      from: DEFAULT_FEEDBACK_ANALYSIS_SIGNAL_TIME_RANGE_FROM,
    },
    meta: { description: 'Which signals the analysis reads. A read filter only.' },
  }
);

// `oneOf` needs a tuple type, but `map()` returns a plain array.
const improvementActionSchema = schema.oneOf(
  IMPROVEMENT_ACTIONS.map((action) => schema.literal(action)) as [Type<ImprovementAction>],
  {
    meta: {
      description:
        'Add, edit, or remove a Knowledge Indicator (`*_ki`), a workflow automation (`*_workflow`), or a source (`*_source`).',
    },
  }
);

export const feedbackAnalysisSchema = schema.object(
  {
    enabled: schema.boolean({
      meta: {
        description:
          'Desired state of the recurring analysis. The scheduler stays authoritative for whether it is actually running.',
      },
    }),
    agent_id: schema.maybe(
      schema.string({
        maxLength: MAX_AI_INDEX_FEEDBACK_AGENT_ID_LENGTH,
        meta: {
          description: 'Agent Builder agent ID that runs this index’s feedback-loop analysis.',
        },
      })
    ),
    schedule: schema.object(
      {
        interval: schema.string({
          maxLength: MAX_FEEDBACK_ANALYSIS_INTERVAL_LENGTH,
          validate: validateFeedbackAnalysisInterval,
          meta: {
            description: `How often to analyze, for example \`1h\` or \`24h\`. At least ${MIN_FEEDBACK_ANALYSIS_INTERVAL_MINUTES} minutes.`,
          },
        }),
      },
      {
        defaultValue: { interval: DEFAULT_FEEDBACK_ANALYSIS_INTERVAL },
        meta: { description: 'When the analysis runs.' },
      }
    ),
    signal_time_range: signalTimeRangeSchema,
    signal_filter: schema.maybe(
      schema.string({
        maxLength: MAX_FEEDBACK_ANALYSIS_SIGNAL_FILTER_LENGTH,
        validate: validateSignalFilter,
        meta: {
          description:
            'KQL narrowing which signals this index analyzes, for example `tags: query_error`.',
        },
      })
    ),
    allowed_actions: schema.arrayOf(improvementActionSchema, {
      defaultValue: [...IMPROVEMENT_ACTIONS],
      maxSize: IMPROVEMENT_ACTIONS.length,
      meta: {
        description: 'Improvement actions the analysis may propose. An empty list is observe-only.',
      },
    }),
  },
  {
    validate: ({ schedule, signal_time_range: signalTimeRange }) =>
      validateSignalWindowCoversInterval(schedule.interval, signalTimeRange),
    meta: {
      description:
        'The recurring feedback analysis, which reads agent signals and proposes improvement actions for the AI Index.',
    },
  }
);

export const kiIdParamsSchema = schema.object({
  aiIndexId: aiIndexIdSchema,
  kiId: schema.string({
    minLength: 1,
    maxLength: MAX_KI_ID_LENGTH,
    meta: { description: 'The document ID of the Knowledge Indicator.' },
  }),
});

const aiIndexTraceSchema = schema.oneOf([
  schema.object({
    type: schema.literal('elastic_agent'),
    value: schema.string({
      minLength: 1,
      maxLength: MAX_AI_INDEX_TRACE_VALUE_LENGTH,
      meta: { description: 'The Agent Builder agent ID.' },
    }),
  }),
  schema.object({
    type: schema.literal('index'),
    value: schema.string({
      minLength: 1,
      maxLength: MAX_AI_INDEX_TRACE_VALUE_LENGTH,
      validate: (value) => {
        if (value.split(',').length > MAX_AI_INDEX_TRACE_INDEX_EXPRESSIONS) {
          return `value must contain at most ${MAX_AI_INDEX_TRACE_INDEX_EXPRESSIONS} comma-separated expressions`;
        }
      },
      meta: { description: 'An index or data stream name or pattern to read traces from.' },
    }),
  }),
  schema.object({
    type: schema.literal('esql'),
    value: schema.string({
      minLength: 1,
      maxLength: MAX_AI_INDEX_TRACE_VALUE_LENGTH,
      meta: { description: 'An ES|QL query to select traces.' },
    }),
  }),
]);

const aiIndexDestSchema = schema.object(
  {
    type: schema.oneOf([schema.literal('data_stream'), schema.literal('index')], {
      meta: {
        description:
          'The type of the backing store. `data_stream` for a data stream, or `index` for an index.',
      },
    }),
    value: schema.string({
      minLength: 1,
      maxLength: MAX_AI_INDEX_DEST_VALUE_LENGTH,
      meta: {
        description:
          'The data stream or index (e.g. `ai-index-ds-foo`, `ai-index-idx-foo`) the AI Index is attached to. Must name a single data stream or index (no wildcards or comma-separated lists), match `type`, and start with `ai-index-ds-` (for `data_stream`) or `ai-index-idx-` (for `index`). The rest of the value must be a valid AI Index id. System indices are not allowed.',
      },
    }),
  },
  { meta: { description: 'The data stream or index that backs the AI Index.' } }
);

const aiIndexAutomationSchema = schema.object({
  type: schema.literal('workflow'),
  value: schema.string({
    minLength: 1,
    maxLength: MAX_AI_INDEX_AUTOMATION_LENGTH,
    meta: { description: 'The workflow ID.' },
  }),
});

const aiIndexSourceSchema = schema.oneOf([
  schema.object({
    type: schema.literal('esql'),
    value: schema.string({
      minLength: 1,
      maxLength: MAX_AI_INDEX_SOURCE_VALUE_LENGTH,
      meta: {
        description: 'The source value; an ES|QL query when `type` is `esql`. Must be valid ES|QL.',
      },
    }),
  }),
  schema.object({
    type: schema.literal('connector'),
    value: schema.string({
      minLength: 1,
      maxLength: MAX_AI_INDEX_SOURCE_VALUE_LENGTH,
      meta: { description: 'The source value; a connector ID when `type` is `connector`.' },
    }),
  }),
]);

const aiIndexPropertiesSchema = {
  description: schema.maybe(
    schema.string({
      maxLength: MAX_AI_INDEX_DESCRIPTION_LENGTH,
      meta: { description: 'Human-readable description of the AI Index.' },
    })
  ),
  feedback_analysis: schema.maybe(feedbackAnalysisSchema),
  dest: aiIndexDestSchema,
  automations: schema.arrayOf(aiIndexAutomationSchema, {
    maxSize: MAX_AI_INDEX_AUTOMATIONS,
    defaultValue: [],
    meta: {
      description:
        'Automations associated with the AI Index. Defaults to an empty array when omitted.',
    },
  }),
  sources: schema.arrayOf(aiIndexSourceSchema, {
    maxSize: MAX_AI_INDEX_SOURCES,
    defaultValue: [],
    meta: {
      description:
        'Additional sources that provide context for the AI Index. Defaults to an empty array when omitted.',
    },
  }),
  traces: schema.arrayOf(aiIndexTraceSchema, {
    maxSize: MAX_AI_INDEX_TRACES,
    defaultValue: [],
    meta: {
      description:
        'Trace sources linked to this AI Index. A write replaces the whole array. Defaults to an empty array when omitted.',
    },
  }),
};

export const createAiIndexBodySchema = schema.object({
  id: aiIndexIdSchema,
  ...aiIndexPropertiesSchema,
});
export const putAiIndexBodySchema = schema.object(aiIndexPropertiesSchema);

export const listKisQuerySchema = schema.object({
  size: schema.number({
    min: 0,
    max: MAX_KI_PAGE_SIZE,
    defaultValue: DEFAULT_KI_PAGE_SIZE,
  }),
  type: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: MAX_KI_TYPE_FILTER_LENGTH,
      meta: { description: 'When set, return only KIs of this type.' },
    })
  ),
});

export const getKiQuerySchema = schema.object({
  index: schema.string({
    minLength: 1,
    maxLength: MAX_INDEX_NAME_BYTES,
    meta: { description: 'The Elasticsearch index that stores the Knowledge Indicator.' },
  }),
});

export const queryAiIndicesBodySchema = schema.object({
  query: schema.string({
    minLength: 1,
    maxLength: MAX_AI_INDEX_QUERY_LENGTH,
    meta: {
      description:
        'The ES|QL query to run. Its FROM decides which Elasticsearch indices are read (normally `ai-index-*`); the server adds the space filter and a row limit.',
    },
  }),
  params: schema.maybe(
    schema.recordOf(
      schema.string({ minLength: 1, maxLength: MAX_AI_INDEX_QUERY_PARAM_KEY_LENGTH }),
      schema.oneOf([
        schema.string({ maxLength: MAX_AI_INDEX_QUERY_PARAM_VALUE_LENGTH }),
        schema.number(),
        schema.boolean(),
      ]),
      {
        validate: (params) =>
          Object.keys(params).length > MAX_AI_INDEX_QUERY_PARAMS
            ? `must not have more than ${MAX_AI_INDEX_QUERY_PARAMS} entries`
            : undefined,
        meta: { description: 'Values for `?name` placeholders in the query.' },
      }
    )
  ),
  limit: schema.maybe(
    schema.number({
      min: 1,
      max: MAX_AI_INDEX_QUERY_LIMIT,
      validate: validateAiIndexQueryLimit,
      meta: {
        description: `Maximum rows to return. Defaults to ${DEFAULT_AI_INDEX_QUERY_LIMIT}; a trailing \`LIMIT\` in the query is capped to this value.`,
      },
    })
  ),
});

export const deleteAiIndexQuerySchema = schema.object({
  delete_knowledge_indicators: schema.boolean({
    defaultValue: false,
    meta: {
      description:
        'When true, also delete the backing data stream/index, which removes its Knowledge Indicators. Skipped when another AI Index still uses the same dest. Defaults to false.',
    },
  }),
  delete_automations: schema.boolean({
    defaultValue: false,
    meta: {
      description: 'When true, also delete the attached workflow automations. Defaults to false.',
    },
  }),
});

const aiIndexDestResponseSchema = () =>
  schema.object(
    {
      type: schema.oneOf([schema.literal('data_stream'), schema.literal('index')], {
        meta: { description: 'The type of the backing store.' },
      }),
      value: schema.string({
        meta: { description: 'The data stream or index the AI Index is attached to.' },
      }),
    },
    { meta: { description: 'The data stream or index that backs the AI Index.' } }
  );

const aiIndexAutomationResponseSchema = () =>
  schema.object({
    type: schema.literal('workflow'),
    value: schema.string({ meta: { description: 'The workflow ID.' } }),
  });

const aiIndexSourceResponseSchema = () =>
  schema.object({
    type: schema.oneOf([schema.literal('esql'), schema.literal('connector')], {
      meta: { description: '`esql` for an ES|QL query, or `connector` for a data connector.' },
    }),
    value: schema.string({
      meta: { description: 'An ES|QL query for `esql`, or a connector ID for `connector`.' },
    }),
  });

const feedbackAnalysisResponseSchema = () =>
  schema.object(
    {
      enabled: schema.boolean({
        meta: { description: 'Whether the recurring feedback analysis is desired to run.' },
      }),
      agent_id: schema.maybe(
        schema.string({ meta: { description: 'Agent Builder agent ID that runs the analysis.' } })
      ),
      schedule: schema.maybe(
        schema.object(
          {
            interval: schema.string({
              meta: { description: 'How often to analyze, for example `1h`.' },
            }),
          },
          { meta: { description: 'When the analysis runs.' } }
        )
      ),
      signal_time_range: schema.maybe(
        schema.oneOf([
          schema.object({
            type: schema.literal('relative'),
            from: schema.string({
              meta: { description: 'Date math relative to now, for example `now-30d`.' },
            }),
          }),
          schema.object({
            type: schema.literal('absolute'),
            from: schema.string({
              meta: { description: 'ISO 8601 date to analyze signals since.' },
            }),
          }),
        ])
      ),
      signal_filter: schema.maybe(
        schema.string({ meta: { description: 'KQL narrowing which signals the analysis reads.' } })
      ),
      allowed_actions: schema.maybe(
        // codeql[js/kibana/unbounded-array-in-schema] Response schema: validates server output, not request input
        schema.arrayOf(improvementActionSchema, {
          meta: { description: 'Improvement actions the analysis may propose.' },
        })
      ),
    },
    {
      meta: {
        description:
          'The recurring feedback analysis, which reads agent signals and proposes improvement actions for the AI Index.',
      },
    }
  );

const aiIndexTraceWithQueryResponseSchema = () =>
  schema.object({
    type: schema.oneOf(
      [schema.literal('elastic_agent'), schema.literal('index'), schema.literal('esql')],
      {
        meta: {
          description:
            '`elastic_agent` for an Agent Builder agent, `index` for an index or data stream name or pattern, or `esql` for an ES|QL query.',
        },
      }
    ),
    value: schema.string({ meta: { description: 'The trace source value.' } }),
    query: schema.string({
      meta: { description: 'The ES|QL query derived from this trace source at read time.' },
    }),
  });

export const aiIndexHttpItemResponseSchema = () =>
  schema.object({
    id: schema.string({ meta: { description: 'The unique identifier of the AI Index.' } }),
    managed: schema.boolean({
      meta: {
        description: 'Whether the AI Index is managed by a plugin and therefore immutable.',
      },
    }),
    date_created: schema.string({
      meta: { description: 'ISO 8601 timestamp of when the AI Index was created.' },
    }),
    date_modified: schema.string({
      meta: { description: 'ISO 8601 timestamp of when the AI Index was last modified.' },
    }),
    description: schema.maybe(
      schema.string({ meta: { description: 'Human-readable description of the AI Index.' } })
    ),
    dest: aiIndexDestResponseSchema(),
    // codeql[js/kibana/unbounded-array-in-schema] Response schema: validates server output, not request input
    automations: schema.arrayOf(aiIndexAutomationResponseSchema(), {
      meta: { description: 'Automations associated with the AI Index.' },
    }),
    // codeql[js/kibana/unbounded-array-in-schema] Response schema: validates server output, not request input
    sources: schema.arrayOf(aiIndexSourceResponseSchema(), {
      meta: { description: 'Additional sources that provide context for the AI Index.' },
    }),
    // codeql[js/kibana/unbounded-array-in-schema] Response schema: validates server output, not request input
    traces: schema.arrayOf(aiIndexTraceWithQueryResponseSchema(), {
      meta: {
        description: 'Trace sources linked to this AI Index, each with its derived ES|QL query.',
      },
    }),
    feedback_analysis: schema.maybe(feedbackAnalysisResponseSchema()),
  });

export const createAiIndexResponseSchema = () =>
  schema.object(
    {
      status: schema.literal('created'),
    },
    { meta: { description: 'Confirms that the AI Index was created.' } }
  );

export const updateAiIndexResponseSchema = () =>
  schema.object(
    {
      status: schema.literal('updated'),
    },
    { meta: { description: 'Confirms that the AI Index was updated.' } }
  );

export const listAiIndexResponseSchema = () =>
  schema.object({
    // codeql[js/kibana/unbounded-array-in-schema] Response schema: validates server output, not request input
    ai_indices: schema.arrayOf(aiIndexHttpItemResponseSchema(), {
      meta: { description: 'The AI Indices available to the caller in the current space.' },
    }),
  });

export const queryAiIndicesResponseSchema = () =>
  schema.object({
    // codeql[js/kibana/unbounded-array-in-schema] Response schema: validates server output, not request input
    columns: schema.arrayOf(
      schema.object(
        {
          name: schema.string({ meta: { description: 'Column name.' } }),
          type: schema.string({ meta: { description: 'Column ES|QL type.' } }),
        },
        { unknowns: 'allow' }
      ),
      { meta: { description: 'Column metadata for the returned rows.' } }
    ),
    // codeql[js/kibana/unbounded-array-in-schema] Response schema: validates server output, not request input
    values: schema.arrayOf(schema.arrayOf(schema.any()), {
      meta: {
        description:
          'Row values, aligned positionally with `columns`, as Elasticsearch returns them. A multi-valued field is an array; `_source` and `flattened` columns are objects.',
      },
    }),
  });

export const describeAiIndexResponseSchema = () =>
  schema.object({
    response: schema.string({
      meta: { description: 'Free-form text context block describing the AI Index for an agent.' },
    }),
  });

export const deleteAiIndexResponseSchema = () =>
  schema.object({
    acknowledged: schema.boolean({
      meta: { description: 'Whether the AI Index entry was deleted.' },
    }),
    // codeql[js/kibana/unbounded-array-in-schema] Response schema: validates server output, not request input
    errors: schema.arrayOf(schema.string(), {
      meta: { description: 'Best-effort cleanup errors after the entry was deleted, if any.' },
    }),
  });

export const errorResponseSchema = () =>
  schema.object(
    {
      statusCode: schema.maybe(schema.number({ meta: { description: 'The HTTP status code.' } })),
      error: schema.maybe(schema.string({ meta: { description: 'The HTTP status text.' } })),
      message: schema.string({ meta: { description: 'A human-readable error message.' } }),
    },
    { meta: { description: 'Generic error response.' } }
  );
