/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import type { PanelContent } from '../resolve_panel';

/**
 * Panel kinds: the kinds of panel the dashboard agent can author.
 *
 * A kind is stored as exactly one embeddable type, whose registered schema validates every config
 * the kind produces. Its `selection` line and `guidance` are its only agent-facing text besides its
 * schema descriptions: the dashboards skill is assembled from them, so a kind is described once.
 */
interface PanelKindBase {
  /** Embeddable type panels of this kind are stored as. Edits may only target panels of this type. */
  readonly embeddableType: string;
  /** Human-readable name used in the skill, references and errors, e.g. "anomaly charts". */
  readonly label: string;
  /**
   * The kind's line in the skill's panel type list, where kinds are offered in ascending
   * `priority`. Kinds without it are not listed.
   */
  readonly selection?: { readonly priority: number; readonly whenToUse: string };
  /**
   * How to create and edit panels of this kind, including whether an edit replaces or merges the
   * existing config. A section of the skill for inline kinds, the top of the reference otherwise.
   */
  readonly guidance?: string;
  /** Whether an existing panel of the kind's embeddable type can be edited. Defaults to true. */
  readonly canEdit?: (panel: AttachmentPanel) => boolean;
  /** Names the panels `canEdit` rejects in edit errors, e.g. "Lens panel that is not backed by ES|QL". */
  readonly uneditableDescription?: string;
  /**
   * Set when the embeddable type registers its schema whenever it is registered at all, so a missing
   * schema means the panel type is not available in the deployment. Leave unset for embeddables whose
   * schema depends on a setting, e.g. Lens without its as-code API: their panels are not validated then.
   */
  readonly schemaAlwaysRegistered?: boolean;
}

/** Turns a by-value kind's validated config into panel content, or returns why it is invalid. */
export type ExecuteConfigPanelKind = (config: AttachmentPanel['config']) => ExecuteConfigResult;

export type ExecuteConfigResult = { panelContent: PanelContent } | { error: string };

/**
 * A kind the agent authors by value (`source: 'config'`), discriminated by `type`, whose content
 * schema is part of the tool schema. Declare with `defineConfigPanelKind`.
 */
export interface ConfigPanelKind extends PanelKindBase {
  readonly source: 'config';
  readonly type: string;
  /** Content of an upsert item that creates a panel of this kind or edits one. */
  readonly contentSchema: z.ZodObject;
  readonly execute: ExecuteConfigPanelKind;
}

/**
 * A by-value kind whose config schema stays out of the tool schema, for kinds few dashboards use,
 * such as ML panels. The tool accepts any object as its `config`, which `execute` validates against
 * `configSchema`, and the agent reads the config shape and `guidance` from the kind's reference.
 * Declare with `defineReferencedConfigPanelKind`.
 */
export interface ReferencedConfigPanelKind extends PanelKindBase {
  readonly source: 'config';
  readonly type: string;
  readonly guidance: string;
  /** The agent-facing config, published in the kind's reference. */
  readonly configSchema: z.ZodType<AttachmentPanel['config']>;
  readonly execute: ExecuteConfigPanelKind;
}

/**
 * A kind generated server-side (`source: 'request'`), discriminated by `renderer`. The host
 * executes its requests: `PanelKindExecutors` needs one executor per request kind. Declare with
 * `defineRequestPanelKind`.
 */
export interface RequestPanelKind extends PanelKindBase {
  readonly source: 'request';
  readonly renderer: string;
  /** Content of an upsert item that creates a panel of this kind or edits one. */
  readonly contentSchema: z.ZodObject;
}

interface ConfigDiscriminator<Type extends string> {
  source: z.ZodLiteral<'config'>;
  type: z.ZodLiteral<Type>;
}

/**
 * Declares a by-value kind whose content schema carries its `type` literal. Without `execute`, the
 * config, already validated by the tool schema, is stored as is.
 */
export const defineConfigPanelKind = <
  const Type extends string,
  Shape extends ConfigDiscriminator<Type> & z.ZodRawShape
>({
  execute,
  ...kind
}: PanelKindBase & {
  type: Type;
  contentSchema: z.ZodObject<Shape>;
  execute?: ExecuteConfigPanelKind;
}) =>
  ({
    source: 'config',
    ...kind,
    execute: execute ?? ((config) => ({ panelContent: { type: kind.embeddableType, config } })),
  } as const satisfies ConfigPanelKind);

/**
 * Declares a by-value kind whose config is validated against `configSchema` when it is executed,
 * then mapped onto the embeddable's stored config by `toEmbeddableConfig` (passed through when
 * omitted).
 */
export const defineReferencedConfigPanelKind = <const Type extends string>({
  toEmbeddableConfig = (config) => config,
  ...kind
}: PanelKindBase & {
  type: Type;
  /** The reference's only text besides the config schema, so it is required. */
  guidance: string;
  configSchema: z.ZodType<AttachmentPanel['config']>;
  toEmbeddableConfig?: (config: AttachmentPanel['config']) => AttachmentPanel['config'];
}) =>
  ({
    source: 'config',
    ...kind,
    execute: (config) => {
      const result = kind.configSchema.safeParse(config);
      if (!result.success) {
        return {
          error: `Invalid ${kind.label} config. Read the "${
            kind.type
          }" config reference and fix:\n${z.prettifyError(result.error)}`,
        };
      }
      return {
        panelContent: { type: kind.embeddableType, config: toEmbeddableConfig(result.data) },
      };
    },
  } as const satisfies ReferencedConfigPanelKind);

/** Lens is the default renderer, so its `renderer` field may be optional. */
type RendererField<Renderer extends string> =
  | z.ZodLiteral<Renderer>
  | z.ZodOptional<z.ZodLiteral<Renderer>>;

interface RequestDiscriminator<Renderer extends string> {
  source: z.ZodLiteral<'request'>;
  renderer: RendererField<Renderer>;
}

/** Declares a server-side generated kind. The content schema must carry the kind's `renderer` literal. */
export const defineRequestPanelKind = <
  const Renderer extends string,
  Shape extends RequestDiscriminator<Renderer> & z.ZodRawShape
>(
  kind: PanelKindBase & {
    renderer: Renderer;
    contentSchema: z.ZodObject<Shape>;
  }
) => ({ source: 'request', ...kind } as const satisfies RequestPanelKind);
