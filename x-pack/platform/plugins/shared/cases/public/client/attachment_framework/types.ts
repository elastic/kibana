/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { EuiCommentProps, IconType, EuiButtonProps, EuiThemeComputed } from '@elastic/eui';
import type { z } from '@kbn/zod/v4';
import type {
  ExternalReferenceAttachmentPayload,
  PersistableStateAttachmentPayload,
  UnifiedReferenceAttachmentPayload,
  UnifiedValueAttachmentPayload,
} from '../../../common/types/domain';
import type { CaseUI, CaseUser } from '../../containers/types';

export enum AttachmentActionType {
  BUTTON = 'button',
  CUSTOM = 'custom',
}

interface BaseAttachmentAction {
  type: AttachmentActionType;
  isPrimary?: boolean;
  disabled?: boolean;
}

interface ButtonAttachmentAction extends BaseAttachmentAction {
  label: string;
  type: AttachmentActionType.BUTTON;
  onClick: () => void;
  iconType: string;
  color?: EuiButtonProps['color'];
}

interface CustomAttachmentAction extends BaseAttachmentAction {
  type: AttachmentActionType.CUSTOM;
  render: () => JSX.Element;
}

export type AttachmentAction = ButtonAttachmentAction | CustomAttachmentAction;

export interface AttachmentViewObject<Props = {}> {
  timelineAvatar?: EuiCommentProps['timelineAvatar'];
  getActions?: (props: Props) => AttachmentAction[];
  event?: EuiCommentProps['event'];
  eventColor?: EuiCommentProps['eventColor'];
  children?: React.LazyExoticComponent<React.FC<Props>>;
  hideDefaultActions?: boolean;
  deleteSuccessTitle?: string;
  className?: string;
  css?: EuiCommentProps['css'];
}

export interface AttachmentTabViewObject<Props = {}> {
  children?: React.ComponentType<Props>;
}

export interface CommonAttachmentViewProps {
  savedObjectId: string;
  caseData: Pick<CaseUI, 'id' | 'title'>;
}

/** Props for case-level attachment tabs (Alerts/Events/… table hosts). */
export interface CommonAttachmentTabViewProps {
  caseData: CaseUI;
}

export interface ExternalReferenceAttachmentViewProps extends CommonAttachmentViewProps {
  externalReferenceId: ExternalReferenceAttachmentPayload['externalReferenceId'];
  externalReferenceMetadata: ExternalReferenceAttachmentPayload['externalReferenceMetadata'];
}

export interface PersistableStateAttachmentViewProps extends CommonAttachmentViewProps {
  persistableStateAttachmentTypeId: PersistableStateAttachmentPayload['persistableStateAttachmentTypeId'];
  persistableStateAttachmentState: PersistableStateAttachmentPayload['persistableStateAttachmentState'];
}

export interface RowContext {
  manageMarkdownEditIds: string[];
  selectedOutlineCommentId: string;
  loadingCommentIds: string[];
  appId: string;
  euiTheme: EuiThemeComputed<{}>;
}

/**
 * View props for reference-based unified attachments (e.g., alerts, events)
 * These attachments reference external entities by ID
 */
export interface UnifiedReferenceAttachmentViewProps<
  Metadata = UnifiedReferenceAttachmentPayload['metadata']
> extends CommonAttachmentViewProps {
  attachmentId: UnifiedReferenceAttachmentPayload['attachmentId'];
  metadata?: Metadata;
  createdBy: CaseUser;
  version: string;
  rowContext: RowContext;
}

/**
 * View props for value-based unified attachments (e.g., lens, user comments)
 * These attachments contain data/content directly
 */
export interface UnifiedValueAttachmentViewProps<Data = UnifiedValueAttachmentPayload['data']>
  extends CommonAttachmentViewProps {
  data: Data;
  createdBy: CaseUser;
  version: string;
  rowContext: RowContext;
}

/**
 * View props for hybrid unified attachments — types whose schema is a union of
 * value-typed and reference-typed payload arms (e.g. lens). All payload-bearing
 * fields are optional; the renderer narrows at runtime via type guards.
 *
 * Runtime is already shape-agnostic: `unified_attachment.tsx` forwards
 * `data`/`attachmentId`/`metadata` regardless of registered kind, and the
 * server validates the full payload against the supplied zod schema.
 */
export interface UnifiedHybridAttachmentViewProps<
  Data = UnifiedValueAttachmentPayload['data'],
  Metadata = UnifiedReferenceAttachmentPayload['metadata']
> extends CommonAttachmentViewProps {
  data?: Data;
  attachmentId?: UnifiedReferenceAttachmentPayload['attachmentId'];
  metadata?: Metadata;
  createdBy: CaseUser;
  version: string;
  rowContext: RowContext;
}

export interface AttachmentType<Props> {
  id: string;
  icon: IconType;
  displayName: string;
  getAttachmentViewObject: (props: Props) => AttachmentViewObject<Props>;
  getAttachmentRemovalObject?: (props: Props) => Pick<AttachmentViewObject<Props>, 'event'>;
  getAttachmentTabViewObject?: (
    props?: CommonAttachmentTabViewProps
  ) => AttachmentTabViewObject<CommonAttachmentTabViewProps>;
  schemaValidator?: (data: unknown) => void;
}

interface UnifiedAttachmentSchema {
  /** Full-payload zod schema. Preferred over `schemaValidator`. */
  schema?: z.ZodType;
}

export type ExternalReferenceAttachmentType = AttachmentType<ExternalReferenceAttachmentViewProps>;
export type PersistableStateAttachmentType = AttachmentType<PersistableStateAttachmentViewProps>;
export type UnifiedReferenceAttachmentType<
  Metadata = UnifiedReferenceAttachmentPayload['metadata']
> = AttachmentType<UnifiedReferenceAttachmentViewProps<Metadata>> & UnifiedAttachmentSchema;
export type UnifiedValueAttachmentType<Data = UnifiedValueAttachmentPayload['data']> =
  AttachmentType<UnifiedValueAttachmentViewProps<Data>> & UnifiedAttachmentSchema;
export type UnifiedHybridAttachmentType<
  Data = UnifiedValueAttachmentPayload['data'],
  Metadata = UnifiedReferenceAttachmentPayload['metadata']
> = AttachmentType<UnifiedHybridAttachmentViewProps<Data, Metadata>> & UnifiedAttachmentSchema;
export interface AttachmentFramework {
  registerExternalReference: (
    externalReferenceAttachmentType: ExternalReferenceAttachmentType
  ) => void;
  registerPersistableState: (
    persistableStateAttachmentType: PersistableStateAttachmentType
  ) => void;
  registerUnified: (
    unifiedAttachmentType: UnifiedReferenceAttachmentType | UnifiedValueAttachmentType
  ) => void;
}

/** A schema that can produce a payload with `attachmentId` (any union arm). */
type HasReferenceArm<S extends z.ZodType> = Extract<
  z.infer<S>,
  { attachmentId: string }
> extends never
  ? false
  : true;

/** A schema that can produce a payload with `data` (any union arm). */
type HasValueArm<S extends z.ZodType> = Extract<z.infer<S>, { data: unknown }> extends never
  ? false
  : true;

/** Pull the `data` shape from any value arm of `S`. */
type DataFromSchema<S extends z.ZodType> = Extract<z.infer<S>, { data: unknown }> extends {
  data: infer D;
}
  ? D
  : never;

/** Pull the `metadata` shape from any reference arm of `S`. */
type MetadataFromSchema<S extends z.ZodType> = Extract<
  z.infer<S>,
  { attachmentId: string }
> extends { metadata?: infer M }
  ? M
  : never;

/**
 * Pick the right view-prop interface based on schema arms:
 * - reference arms only      → `UnifiedReferenceAttachmentType`
 * - value arms only          → `UnifiedValueAttachmentType`
 * - both (e.g. lens)         → `UnifiedHybridAttachmentType`
 */
type UnifiedAttachmentTypeFromSchema<S extends z.ZodType> = HasReferenceArm<S> extends true
  ? HasValueArm<S> extends true
    ? UnifiedHybridAttachmentType<DataFromSchema<S>, MetadataFromSchema<S>>
    : UnifiedReferenceAttachmentType<MetadataFromSchema<S>>
  : UnifiedValueAttachmentType<DataFromSchema<S>>;

/**
 * Broad registration type returned to callers. Returns the hybrid type for
 * schemas with both arms so the registered renderer's `getAttachmentViewObject`
 * accepts either-shape props at the call site (tests, the unified-attachment
 * runtime forwarder, etc.).
 */
type UnifiedAttachmentTypeForRegistry<S extends z.ZodType> = HasReferenceArm<S> extends true
  ? HasValueArm<S> extends true
    ? UnifiedHybridAttachmentType
    : UnifiedReferenceAttachmentType
  : UnifiedValueAttachmentType;

/**
 * Defines a unified attachment. Renderer prop narrowing (`data` /
 * `attachmentId` / `metadata`) is inferred from `schema`, which the registry
 * also uses for full-payload validation. Schemas with both value and
 * reference arms (e.g. lens) get hybrid view props with optional fields and
 * are expected to narrow at runtime.
 *
 * Runtime is already shape-agnostic: `unified_attachment.tsx` forwards
 * `data`/`attachmentId`/`metadata` regardless of registered kind.
 */
export const defineAttachment = <S extends z.ZodType>(
  attachmentType: UnifiedAttachmentTypeFromSchema<S> & { schema: S }
): UnifiedAttachmentTypeForRegistry<S> =>
  attachmentType as unknown as UnifiedAttachmentTypeForRegistry<S>;
