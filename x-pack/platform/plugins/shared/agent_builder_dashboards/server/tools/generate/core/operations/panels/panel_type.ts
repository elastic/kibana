/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import type { InlinePanelOperationType, PanelResolutionRequestBase } from '../../resolve_panel';

/** Resolved panel content: the embeddable `type` plus its by-value `config`. */
export type PanelContent = Pick<AttachmentPanel, 'type' | 'config'>;

/** Outcome of validating whether an existing panel can be edited by config. */
export type ConfigEditValidation = { ok: true } | { ok: false; error: string };

/**
 * Fields shared by every parsed `source: 'request'` panel input, independent of
 * panel type. Each type's create/edit request schemas add their own payload on
 * top of this shape (e.g. `panels/vis` adds the natural-language / ES|QL fields).
 */
export interface PanelResolutionSourceInput {
  source: 'request';
  /** Model-facing panel type discriminant (`'vis'`, ...). */
  type: string;
}

/** Parameters handed to a panel type's {@link PanelTypeDefinition.buildResolutionRequest}. */
export interface BuildResolutionRequestParams<
  TResolutionInput extends PanelResolutionSourceInput = PanelResolutionSourceInput
> {
  /** The parsed `source: 'request'` panel input (create or edit shape). */
  input: TResolutionInput;
  operationType: InlinePanelOperationType;
  /** Present when editing an existing panel. */
  existingPanel?: AttachmentPanel;
}

/**
 * Static, host-agnostic behavior for a single panel `type`.
 *
 * Each type's module (`panels/<type>`) exports one of these so operations stay
 * type-agnostic: they look the definition up in the registry instead of branching
 * on the literal type. Covers the by-value config path (`source: 'config'`) and,
 * for resolvable types, building the `source: 'request'` resolution request; the
 * async resolution itself stays behind the injected panel resolver seam.
 */
export interface PanelTypeDefinition {
  /** Embeddable type id panels of this type map to. */
  readonly embeddableType: string;
  /** Builds panel content from an already-resolved `source: 'config'` config. */
  readonly buildPanelContent: (config: AttachmentPanel['config']) => PanelContent;
  /**
   * Validates that an existing panel may be replaced via a `source: 'config'`
   * edit of this type. Omit for types that are not editable by config (e.g.
   * `vis`, which edits through `source: 'request'` instead).
   */
  readonly validateConfigEdit?: (existingPanel: AttachmentPanel) => ConfigEditValidation;
  /**
   * Builds this type's resolution request from a parsed `source: 'request'`
   * input, so operations never read type-specific request fields. Omit for
   * types that are not resolvable from a request (e.g. `markdown`). The
   * returned request is this type's member of the `PanelResolutionRequest`
   * union (see the panels barrel).
   */
  readonly buildResolutionRequest?: (
    params: BuildResolutionRequestParams
  ) => PanelResolutionRequestBase & { type: string };
}

/**
 * Builds a {@link PanelTypeDefinition} from a panel type's `embeddableType`,
 * keeping it the single source of truth: `buildPanelContent` defaults to passing
 * the config through to that embeddable, so a type only declares its embeddable
 * id (plus `validateConfigEdit` when editable by config). Pass `buildPanelContent`
 * to override for a type that needs to transform its config, and
 * `buildResolutionRequest` for a type resolvable from a `source: 'request'` input.
 *
 * `buildResolutionRequest` is type-checked here against the type's own input
 * shape and stored type-erased (like `defineOperation`): at dispatch time the
 * input has already been parsed against the discriminated union and looked up
 * by its `type`, so the matching builder receives its own input shape.
 */
export const definePanelType = <
  TResolutionInput extends PanelResolutionSourceInput = PanelResolutionSourceInput
>({
  embeddableType,
  buildPanelContent = (config) => ({ type: embeddableType, config }),
  validateConfigEdit,
  buildResolutionRequest,
}: {
  embeddableType: string;
  buildPanelContent?: (config: AttachmentPanel['config']) => PanelContent;
  validateConfigEdit?: (existingPanel: AttachmentPanel) => ConfigEditValidation;
  buildResolutionRequest?: (
    params: BuildResolutionRequestParams<TResolutionInput>
  ) => PanelResolutionRequestBase & { type: string };
}): PanelTypeDefinition =>
  ({
    embeddableType,
    buildPanelContent,
    validateConfigEdit,
    buildResolutionRequest,
  } as PanelTypeDefinition);
