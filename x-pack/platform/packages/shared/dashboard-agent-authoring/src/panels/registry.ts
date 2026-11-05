/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { z, lazySchema } from '@kbn/zod/v4';
import type { PanelContent, PanelContentAttempt } from '../resolve_panel';
import type { ConfigPanelKind, ReferencedConfigPanelKind } from './panel_kind';
import { lensPanelKind, vegaPanelKind, type VisPanelResolutionRequest } from './vis';
import { markdownPanelKind } from './markdown';
import { customContentPanelKind, type CustomContentPanelResolutionRequest } from './custom_content';
import {
  anomalyChartsPanelKind,
  anomalySwimlanePanelKind,
  singleMetricViewerPanelKind,
} from './ml_panels';
import { attachmentPanelInputSchema } from './attachment_source';

/**
 * Panel kind registry.
 *
 * Panel content is discriminated by `type`, the name of its panel kind:
 * - request kinds (`vis`, `vega`, `custom_content`) are generated server-side by the host.
 * - config kinds are authored by value. Common kinds put their full config schema in the tool
 *   schema; referenced kinds share one member whose `config` is any object, validated against the
 *   kind's `configSchema` when the panel is planned.
 * - `attachment` places an existing visualization attachment from the conversation.
 *
 * Each kind's module describes it once, with `defineConfigPanelKind` or `defineRequestPanelKind`,
 * including one content schema that both creates and edits its panels. Registering it in one of
 * the lists below derives its member of the content schema and the embeddable-type lookups. List
 * order is the order of the schema union sent to the model.
 */

const INLINE_CONFIG_PANEL_KINDS = [markdownPanelKind] as const;

const REFERENCED_CONFIG_PANEL_KINDS = [
  anomalyChartsPanelKind,
  anomalySwimlanePanelKind,
  singleMetricViewerPanelKind,
] as const;

const CONFIG_PANEL_KINDS = [
  ...INLINE_CONFIG_PANEL_KINDS,
  ...REFERENCED_CONFIG_PANEL_KINDS,
] as const;

/**
 * The `satisfies` check makes a request kind whose type has no `PanelResolutionRequest`
 * fail to compile, so the host can resolve every request kind.
 */
const REQUEST_PANEL_KINDS = [
  lensPanelKind,
  vegaPanelKind,
  customContentPanelKind,
] as const satisfies ReadonlyArray<{ readonly type: PanelResolutionRequest['type'] }>;

/**
 * `z.discriminatedUnion` expects a non-empty tuple, while `Array.map` returns a plain array.
 * Only called with lists built from the kind lists above, which are never empty.
 */
const toNonEmpty = <T>([first, ...rest]: readonly T[]): [T, ...T[]] => [first, ...rest];

/** Bounds a referenced config, whose schema is not in the tool schema, by its serialized size. */
const MAX_REFERENCED_CONFIG_LENGTH = 50000;

const referencedConfigPanelContentSchema = lazySchema(() =>
  z.object({
    type: z.enum(toNonEmpty(REFERENCED_CONFIG_PANEL_KINDS.map(({ type }) => type))),
    config: z
      .record(z.string(), z.unknown())
      .refine((config) => JSON.stringify(config).length <= MAX_REFERENCED_CONFIG_LENGTH, {
        message: `config must be at most ${MAX_REFERENCED_CONFIG_LENGTH} characters when serialized`,
      })
      .describe(
        "Panel config, whose shape depends on `type`: read the type's config reference before writing it. On an existing panel, fully replaces its config."
      ),
  })
);

/**
 * Panel content of an upsert item: creates a panel of any kind, or edits an existing panel of the
 * same kind.
 */
export const upsertPanelContentSchema = lazySchema(() =>
  z.discriminatedUnion(
    'type',
    toNonEmpty([
      ...REQUEST_PANEL_KINDS.map(({ contentSchema }) => contentSchema),
      ...INLINE_CONFIG_PANEL_KINDS.map(({ contentSchema }) => contentSchema),
      referencedConfigPanelContentSchema,
      attachmentPanelInputSchema,
    ])
  )
);

export type UpsertPanelContent = z.infer<typeof upsertPanelContentSchema>;

type ConfigPanelType = (typeof CONFIG_PANEL_KINDS)[number]['type'];

/** The kind types the host executes. */
type RequestPanelType = (typeof REQUEST_PANEL_KINDS)[number]['type'];

type ConfigPanelContent = Extract<UpsertPanelContent, { type: ConfigPanelType }>;

export type PanelRequestContent = Extract<UpsertPanelContent, { type: RequestPanelType }>;

const configPanelKindByType = new Map<string, ConfigPanelKind | ReferencedConfigPanelKind>(
  CONFIG_PANEL_KINDS.map((kind) => [kind.type, kind])
);

/** Whether the content authors a by-value panel, whose config the agent wrote. */
export const isConfigPanelContent = (content: UpsertPanelContent): content is ConfigPanelContent =>
  configPanelKindByType.has(content.type);

const getConfigPanelKind = (
  type: ConfigPanelContent['type']
): ConfigPanelKind | ReferencedConfigPanelKind => {
  const kind = configPanelKindByType.get(type);
  if (!kind) {
    throw new Error(`Panel type "${type}" is not registered.`);
  }
  return kind;
};

/**
 * Builds panel content from a by-value panel's `type` and `config`, or returns why the config is
 * invalid for a referenced kind.
 */
export const buildConfigPanelContent = (
  type: ConfigPanelContent['type'],
  config: AttachmentPanel['config']
): PanelContent | { error: string } => {
  const result = getConfigPanelKind(type).execute(config);
  return 'error' in result ? result : result.panelContent;
};

export interface ConfigPanelReference {
  type: string;
  label: string;
  /** Markdown with the kind's guidance, usage, and config JSON Schema. */
  content: string;
}

const toConfigJsonSchema = (configSchema: ReferencedConfigPanelKind['configSchema']) => {
  const { $schema, ...jsonSchema } = z.toJSONSchema(configSchema, {
    io: 'input',
    unrepresentable: 'any',
  });
  return jsonSchema;
};

/** One reference per by-value panel kind whose config schema is left out of the tool schema. */
export const getConfigPanelReferences = (): ConfigPanelReference[] =>
  REFERENCED_CONFIG_PANEL_KINDS.map(({ type, label, guidance, configSchema }) => ({
    type,
    label,
    content: [
      `# ${label} panel config`,
      guidance,
      `Use it as \`content: { type: "${type}", config }\`, where \`config\` matches this JSON Schema:`,
      `\`\`\`json\n${JSON.stringify(toConfigJsonSchema(configSchema))}\n\`\`\``,
    ].join('\n\n'),
  }));

/** Every panel resolution request the resolver can receive, discriminated by `type`. */
export type PanelResolutionRequest =
  | VisPanelResolutionRequest
  | CustomContentPanelResolutionRequest;

/**
 * Contract for inline panel content resolution. Dashboard authoring consumes this
 * to turn a panel resolution request into panel content. The host implements it
 * by routing each request to the resolver for its `type`; it is injected so
 * authoring stays host-agnostic and tests can supply a fake.
 */
export type ResolvePanelContent = (request: PanelResolutionRequest) => Promise<PanelContentAttempt>;

const PANEL_KINDS = [...REQUEST_PANEL_KINDS, ...CONFIG_PANEL_KINDS] as const;

type PanelKind = (typeof PANEL_KINDS)[number];

/** Finds the panel kind stored as the given embeddable type, if any. */
export const findPanelKind = (embeddableType: string): PanelKind | undefined =>
  PANEL_KINDS.find((kind) => kind.embeddableType === embeddableType);

/**
 * Whether panels of the given embeddable type need its registered schema, so a missing one means the
 * panel type is not available in the deployment (see `schemaAlwaysRegistered`).
 */
export const requiresRegisteredSchema = (embeddableType: string): boolean =>
  findPanelKind(embeddableType)?.schemaAlwaysRegistered === true;

const toTitle = (label: string): string => label.replace(/\b\w/g, (letter) => letter.toUpperCase());

const capitalize = (label: string): string => label.charAt(0).toUpperCase() + label.slice(1);

/** The skill's numbered panel type list, in ascending kind priority. */
export const getPanelTypeSelection = (): string =>
  PANEL_KINDS.flatMap((kind) => (kind.selection ? [{ kind, ...kind.selection }] : []))
    .sort((a, b) => a.priority - b.priority)
    .map(
      ({ kind, whenToUse }, index) =>
        `${index + 1}. **${capitalize(kind.label)}** (\`type: "${kind.type}"\`) — ${whenToUse}`
    )
    .join('\n');

/** One skill section per kind whose guidance is sent with every request. */
export const getInlinePanelKindGuidance = (): string =>
  [...REQUEST_PANEL_KINDS, ...INLINE_CONFIG_PANEL_KINDS]
    .flatMap(({ label, guidance }) =>
      guidance ? [`## ${toTitle(label)} Panels\n\n${guidance}`] : []
    )
    .join('\n\n');

/** The resolution request of the kind with the given type. */
type RequestForType<
  Type extends RequestPanelType,
  Request = PanelResolutionRequest
> = Request extends { type: infer Types } ? (Type extends Types ? Request : never) : never;

/**
 * The host's executor for each request kind, keyed by kind type, so a request kind without one
 * fails to compile. Executors may close over host services such as the model provider.
 */
export type PanelKindExecutors = {
  readonly [Type in RequestPanelType]: (
    request: RequestForType<Type>
  ) => Promise<PanelContentAttempt>;
};

type ExecutePanelRequest = (request: PanelResolutionRequest) => Promise<PanelContentAttempt>;

/** Routes each resolution request to the executor of its kind. */
export const createPanelContentResolver =
  (executors: PanelKindExecutors): ResolvePanelContent =>
  (request) => {
    // Indexing by the request's type selects the executor typed for that request.
    const execute = executors[request.type] as ExecutePanelRequest;
    return execute(request);
  };
