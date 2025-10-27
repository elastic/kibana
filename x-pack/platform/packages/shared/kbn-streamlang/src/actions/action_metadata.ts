/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export interface ActionExample {
  description: string;
  yaml: string;
}

export interface ActionMetadata {
  name: string;
  description: string;
  usage: string;
  examples: ActionExample[];
  tips?: string[];
}

export const ACTION_METADATA_MAP: Record<string, ActionMetadata> = {
  grok: {
    name: i18n.translate('xpack.streamlang.actionMetadata.grok.name', {
      defaultMessage: 'Grok',
    }),
    description: i18n.translate('xpack.streamlang.actionMetadata.grok.description', {
      defaultMessage: 'Extract structured data from unstructured text using grok patterns',
    }),
    usage: i18n.translate('xpack.streamlang.actionMetadata.grok.usage', {
      defaultMessage:
        'Configure the `from` field and one or more grok `patterns` to extract fields from the original string. Add `ignore_missing` or `ignore_failure` when the field is optional.',
    }),
    examples: [
      {
        description: i18n.translate('xpack.streamlang.actionMetadata.grok.examples.apache', {
          defaultMessage: 'Parse Apache access logs',
        }),
        yaml: `- action: grok
  from: message
  patterns:
    - "%{IP:client_ip} %{WORD:method} %{URIPATHPARAM:request} %{INT:status}"`,
      },
      {
        description: i18n.translate('xpack.streamlang.actionMetadata.grok.examples.timestamp', {
          defaultMessage: 'Extract timestamp, level, and message segments',
        }),
        yaml: `- action: grok
  from: message
  patterns:
    - "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:details}"
  ignore_failure: true`,
      },
    ],
    tips: [
      i18n.translate('xpack.streamlang.actionMetadata.grok.tips.test', {
        defaultMessage: 'Test patterns with sample data to ensure correct extraction',
      }),
      i18n.translate('xpack.streamlang.actionMetadata.grok.tips.multiplePatterns', {
        defaultMessage: 'Multiple patterns are tried in order until one matches',
      }),
      i18n.translate('xpack.streamlang.actionMetadata.grok.tips.standardPatterns', {
        defaultMessage: 'Use standard grok patterns or define custom patterns',
      }),
    ],
  },

  dissect: {
    name: i18n.translate('xpack.streamlang.actionMetadata.dissect.name', {
      defaultMessage: 'Dissect',
    }),
    description: i18n.translate('xpack.streamlang.actionMetadata.dissect.description', {
      defaultMessage: 'Extract structured data using pattern-based tokenization',
    }),
    usage: i18n.translate('xpack.streamlang.actionMetadata.dissect.usage', {
      defaultMessage:
        'Define a pattern containing {fieldPlaceholder} placeholders separated by literal delimiters. Dissect is faster than grok but expects a consistent structure.',
      values: {
        fieldPlaceholder: '%{field}',
      },
    }),
    examples: [
      {
        description: i18n.translate('xpack.streamlang.actionMetadata.dissect.examples.space', {
          defaultMessage: 'Split a space-delimited message',
        }),
        yaml: `- action: dissect
  from: message
  pattern: "%{timestamp} %{level} %{message}"`,
      },
      {
        description: i18n.translate('xpack.streamlang.actionMetadata.dissect.examples.pipe', {
          defaultMessage: 'Handle pipe separated fields and keep trailing text together',
        }),
        yaml: `- action: dissect
  from: message
  pattern: "%{ip}|%{user}|%{?unused}|%{GREEDYDATA:details}"`,
      },
    ],
    tips: [
      i18n.translate('xpack.streamlang.actionMetadata.dissect.tips.ignore', {
        defaultMessage: 'Use `{ignoreToken}` to ignore tokens you do not want to store',
        values: {
          ignoreToken: '%{?field}',
        },
      }),
      i18n.translate('xpack.streamlang.actionMetadata.dissect.tips.literal', {
        defaultMessage: 'Literal characters in the pattern must match exactly',
      }),
    ],
  },

  set: {
    name: i18n.translate('xpack.streamlang.actionMetadata.set.name', {
      defaultMessage: 'Set',
    }),
    description: i18n.translate('xpack.streamlang.actionMetadata.set.description', {
      defaultMessage: 'Assign a value to a field or copy the value from another field',
    }),
    usage: i18n.translate('xpack.streamlang.actionMetadata.set.usage', {
      defaultMessage:
        'Use `to` to specify the target field. Provide either `value` to assign a constant or `copy_from` to clone another field. Use `override: false` to preserve existing data.',
    }),
    examples: [
      {
        description: i18n.translate('xpack.streamlang.actionMetadata.set.examples.constant', {
          defaultMessage: 'Set a constant value',
        }),
        yaml: `- action: set
  to: status
  value: processed`,
      },
      {
        description: i18n.translate('xpack.streamlang.actionMetadata.set.examples.copy', {
          defaultMessage: 'Copy from another field without overriding existing values',
        }),
        yaml: `- action: set
  to: user.email
  copy_from: metadata.email
  override: false`,
      },
    ],
  },

  rename: {
    name: i18n.translate('xpack.streamlang.actionMetadata.rename.name', {
      defaultMessage: 'Rename',
    }),
    description: i18n.translate('xpack.streamlang.actionMetadata.rename.description', {
      defaultMessage: 'Rename an existing field to a new name',
    }),
    usage: i18n.translate('xpack.streamlang.actionMetadata.rename.usage', {
      defaultMessage:
        'Provide `from` (existing field) and `to` (new field name). Combine with `ignore_missing` if the field may not be present.',
    }),
    examples: [
      {
        description: i18n.translate('xpack.streamlang.actionMetadata.rename.examples.simple', {
          defaultMessage: 'Rename a field',
        }),
        yaml: `- action: rename
  from: old_field
  to: new_field`,
      },
      {
        description: i18n.translate('xpack.streamlang.actionMetadata.rename.examples.nested', {
          defaultMessage: 'Move a field to a namespaced location and override if present',
        }),
        yaml: `- action: rename
  from: user
  to: attributes.user
  override: true`,
      },
    ],
  },

  date: {
    name: i18n.translate('xpack.streamlang.actionMetadata.date.name', {
      defaultMessage: 'Date',
    }),
    description: i18n.translate('xpack.streamlang.actionMetadata.date.description', {
      defaultMessage: 'Parse dates from text fields and convert them to an appropriate timestamp',
    }),
    usage: i18n.translate('xpack.streamlang.actionMetadata.date.usage', {
      defaultMessage:
        'Specify `from` to identify the source text, list the `formats` to try, and optionally `to`/`output_format` to control where and how the parsed date is stored.',
    }),
    examples: [
      {
        description: i18n.translate('xpack.streamlang.actionMetadata.date.examples.iso', {
          defaultMessage: 'Parse ISO8601 dates into @timestamp',
        }),
        yaml: `- action: date
  from: timestamp
  formats:
    - "ISO8601"`,
      },
      {
        description: i18n.translate('xpack.streamlang.actionMetadata.date.examples.custom', {
          defaultMessage: 'Parse a custom date into a dedicated field',
        }),
        yaml: `- action: date
  from: log_date
  to: attributes.event_time
  formats:
    - "yyyy-MM-dd HH:mm:ss"
  output_format: "strict_date_optional_time"`,
      },
    ],
    tips: [
      i18n.translate('xpack.streamlang.actionMetadata.date.tips.order', {
        defaultMessage: 'Formats are tried in order until one succeeds',
      }),
      i18n.translate('xpack.streamlang.actionMetadata.date.tips.outputFormat', {
        defaultMessage:
          'Use output_format to standardise string outputs when not writing to @timestamp',
      }),
    ],
  },

  append: {
    name: i18n.translate('xpack.streamlang.actionMetadata.append.name', {
      defaultMessage: 'Append',
    }),
    description: i18n.translate('xpack.streamlang.actionMetadata.append.description', {
      defaultMessage: 'Append one or more values to an existing array field',
    }),
    usage: i18n.translate('xpack.streamlang.actionMetadata.append.usage', {
      defaultMessage:
        'Use `to` for the array field and provide a `value` array with new items. Set `allow_duplicates: false` to keep the list unique.',
    }),
    examples: [
      {
        description: i18n.translate('xpack.streamlang.actionMetadata.append.examples.tags', {
          defaultMessage: 'Append tags to an existing array',
        }),
        yaml: `- action: append
  to: tags
  value:
    - production
    - web-server`,
      },
      {
        description: i18n.translate('xpack.streamlang.actionMetadata.append.examples.single', {
          defaultMessage: 'Add a single value while preventing duplicates',
        }),
        yaml: `- action: append
  to: attributes.features
  value:
    - tracing
  allow_duplicates: false`,
      },
    ],
  },

  convert: {
    name: i18n.translate('xpack.streamlang.actionMetadata.convert.name', {
      defaultMessage: 'Convert',
    }),
    description: i18n.translate('xpack.streamlang.actionMetadata.convert.description', {
      defaultMessage: 'Convert field values to another data type',
    }),
    usage: i18n.translate('xpack.streamlang.actionMetadata.convert.usage', {
      defaultMessage:
        'Provide the source `from` field and a target `type`. Optionally set `to` for the destination field if you want to keep the original.',
    }),
    examples: [
      {
        description: i18n.translate('xpack.streamlang.actionMetadata.convert.examples.integer', {
          defaultMessage: 'Convert a string field to an integer',
        }),
        yaml: `- action: convert
  from: status_code
  type: integer`,
      },
      {
        description: i18n.translate('xpack.streamlang.actionMetadata.convert.examples.float', {
          defaultMessage: 'Convert string price into a float stored in a new field',
        }),
        yaml: `- action: convert
  from: price_string
  to: price
  type: float`,
      },
    ],
    tips: [
      i18n.translate('xpack.streamlang.actionMetadata.convert.tips.auto', {
        defaultMessage: 'Use "auto" type to automatically detect the best type',
      }),
      i18n.translate('xpack.streamlang.actionMetadata.convert.tips.ignoreFailure', {
        defaultMessage: 'Enable ignore_failure to keep documents when conversion fails',
      }),
    ],
  },

  remove_by_prefix: {
    name: i18n.translate('xpack.streamlang.actionMetadata.removeByPrefix.name', {
      defaultMessage: 'Remove by Prefix',
    }),
    description: i18n.translate('xpack.streamlang.actionMetadata.removeByPrefix.description', {
      defaultMessage: 'Remove every field that starts with a particular prefix',
    }),
    usage: i18n.translate('xpack.streamlang.actionMetadata.removeByPrefix.usage', {
      defaultMessage:
        'Set the `from` value to the prefix to match. Use it to strip temporary or namespaced fields after processing.',
    }),
    examples: [
      {
        description: i18n.translate(
          'xpack.streamlang.actionMetadata.removeByPrefix.examples.temp',
          {
            defaultMessage: 'Remove temporary enrichment fields',
          }
        ),
        yaml: `- action: remove_by_prefix
  from: temp_`,
      },
      {
        description: i18n.translate(
          'xpack.streamlang.actionMetadata.removeByPrefix.examples.debug',
          {
            defaultMessage: 'Drop all debug.* fields before indexing',
          }
        ),
        yaml: `- action: remove_by_prefix
  from: debug.`,
      },
    ],
    tips: [
      i18n.translate('xpack.streamlang.actionMetadata.removeByPrefix.tips.clean', {
        defaultMessage: 'Great for cleaning up helper fields created earlier in the pipeline',
      }),
    ],
  },

  remove: {
    name: i18n.translate('xpack.streamlang.actionMetadata.remove.name', {
      defaultMessage: 'Remove',
    }),
    description: i18n.translate('xpack.streamlang.actionMetadata.remove.description', {
      defaultMessage: 'Delete a specific field from the document',
    }),
    usage: i18n.translate('xpack.streamlang.actionMetadata.remove.usage', {
      defaultMessage:
        'Provide the `from` field to delete. Combine with `ignore_missing` if the field may not exist.',
    }),
    examples: [
      {
        description: i18n.translate('xpack.streamlang.actionMetadata.remove.examples.sensitive', {
          defaultMessage: 'Remove a sensitive field',
        }),
        yaml: `- action: remove
  from: password`,
      },
      {
        description: i18n.translate('xpack.streamlang.actionMetadata.remove.examples.nested', {
          defaultMessage: 'Drop a nested attribute when present',
        }),
        yaml: `- action: remove
  from: attributes.debug`,
      },
    ],
  },
};
