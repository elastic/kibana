/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BOILERPLATE_PIPELINE = {
  processors: [
    {
      set: {
        tag: 'set_ecs_version',
        field: 'ecs.version',
        value: '9.3.0',
      },
    },
    {
      rename: {
        tag: 'rename_message_to_event_original',
        field: 'message',
        target_field: 'event.original',
        ignore_missing: true,
        if: 'ctx.event?.original == null',
      },
    },
    {
      remove: {
        tag: 'remove_message',
        field: 'message',
        ignore_missing: true,
        if: 'ctx.event?.original != null',
        description:
          'The message field is no longer required if the document has an event.original field.',
      },
    },
  ],
  on_failure: [
    {
      set: {
        field: 'event.kind',
        value: 'pipeline_error',
      },
    },
    {
      append: {
        field: 'error.message',
        value:
          "Processor '{{{ _ingest.on_failure_processor_type }}}' {{#_ingest.on_failure_processor_tag}}with tag '{{{ _ingest.on_failure_processor_tag }}}' {{/_ingest.on_failure_processor_tag}}in pipeline '{{{ _ingest.pipeline }}}' failed with message '{{{ _ingest.on_failure_message }}}'",
      },
    },
    {
      append: {
        field: 'tags',
        value: 'preserve_original_event',
        allow_duplicates: false,
      },
    },
  ],
};

export const BOILERPLATE_PROCESSOR_COUNT = BOILERPLATE_PIPELINE.processors.length;

interface ProcessorTocEntry {
  index: number;
  type: string;
  tag: string;
}

export const getProcessorType = (processor: Record<string, unknown>): string => {
  const keys = Object.keys(processor);
  return keys[0] ?? 'unknown';
};

export const getProcessorTag = (processor: Record<string, unknown>): string => {
  const type = getProcessorType(processor);
  const config = processor[type] as Record<string, unknown> | undefined;
  return (config?.tag as string) ?? '';
};

export const buildPipelineToc = (processors: Array<Record<string, unknown>>): ProcessorTocEntry[] =>
  processors.map((proc, i) => ({
    index: i,
    type: getProcessorType(proc),
    tag: getProcessorTag(proc),
  }));

export const formatPipelineToc = (processors: Array<Record<string, unknown>>): string => {
  const toc = buildPipelineToc(processors);
  return toc.map((entry) => `[${entry.index}] ${entry.type}: ${entry.tag}`).join('\n');
};

const MAX_COMPACT_CUSTOM_LINES = 18;
const COMPACT_HEAD = 10;
const COMPACT_TAIL = 6;

/**
 * TOC for custom processors only (after boilerplate), truncated for token efficiency.
 */
export const formatCompactCustomProcessorToc = (
  processors: Array<Record<string, unknown>>,
  boilerplateProcessorCount: number
): string => {
  if (processors.length <= boilerplateProcessorCount) {
    return '(no custom processors after boilerplate yet)';
  }
  const lines: string[] = [];
  for (let i = boilerplateProcessorCount; i < processors.length; i++) {
    const proc = processors[i];
    lines.push(`[${i}] ${getProcessorType(proc)}: ${getProcessorTag(proc)}`);
  }
  if (lines.length <= MAX_COMPACT_CUSTOM_LINES) {
    return lines.join('\n');
  }
  const omitted = lines.length - COMPACT_HEAD - COMPACT_TAIL;
  return [
    ...lines.slice(0, COMPACT_HEAD),
    `... (${omitted} processors omitted; indices ${boilerplateProcessorCount + COMPACT_HEAD}–${
      processors.length - COMPACT_TAIL - 1
    }) ...`,
    ...lines.slice(-COMPACT_TAIL),
  ].join('\n');
};
