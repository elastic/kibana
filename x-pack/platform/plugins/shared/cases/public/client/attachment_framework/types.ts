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
import { AttachmentActionType } from '../../../common/utils/attachment_actions';

export { AttachmentActionType };
export { defineAttachment } from './define_attachment';

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
  searchTerm?: string;
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

type AttachmentId = UnifiedReferenceAttachmentPayload['attachmentId'];
type ReferenceMetadata = UnifiedReferenceAttachmentPayload['metadata'];
export type ReferenceData = UnifiedReferenceAttachmentPayload['data'];
type ValueData = UnifiedValueAttachmentPayload['data'];
type HybridData = ValueData | ReferenceData;

interface UnifiedAttachmentViewPropsBase extends CommonAttachmentViewProps {
  createdBy: CaseUser;
  version: string;
  rowContext: RowContext;
}

/** Reference attachments point at another entity and may include a cached snapshot. */
export interface UnifiedReferenceAttachmentViewProps<
  Metadata = ReferenceMetadata,
  Id = AttachmentId,
  Data = ReferenceData
> extends UnifiedAttachmentViewPropsBase {
  attachmentId: Id;
  data?: Data;
  metadata?: Metadata;
}

/** Value attachments store all renderable content directly on the case comment. */
export interface UnifiedValueAttachmentViewProps<Data = ValueData>
  extends UnifiedAttachmentViewPropsBase {
  data: Data;
}

/** Hybrid attachments support value and reference payloads under one attachment type id. */
export interface UnifiedHybridAttachmentViewProps<
  Data = HybridData,
  Metadata = ReferenceMetadata,
  Id = AttachmentId
> extends UnifiedAttachmentViewPropsBase {
  attachmentId?: Id;
  metadata?: Metadata;
  data?: Data;
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
  /**
   * Schema exposed to workflow authors. When unset, workflow steps fall back to
   * `schema` if it is a Zod object; when `false`, the type is excluded.
   */
  workflowSchema?: z.ZodObject | false;
}

export type ExternalReferenceAttachmentType = AttachmentType<ExternalReferenceAttachmentViewProps>;
export type PersistableStateAttachmentType = AttachmentType<PersistableStateAttachmentViewProps>;

type UnifiedAttachmentRegistration<Props> = AttachmentType<Props> & UnifiedAttachmentSchema;
export type UnifiedReferenceAttachmentType<
  Metadata = ReferenceMetadata,
  Id = AttachmentId,
  Data = ReferenceData
> = UnifiedAttachmentRegistration<UnifiedReferenceAttachmentViewProps<Metadata, Id, Data>>;

export type UnifiedValueAttachmentType<Data = ValueData> = UnifiedAttachmentRegistration<
  UnifiedValueAttachmentViewProps<Data>
>;

export type UnifiedHybridAttachmentType<
  Data = HybridData,
  Metadata = ReferenceMetadata,
  Id = AttachmentId
> = UnifiedAttachmentRegistration<UnifiedHybridAttachmentViewProps<Data, Metadata, Id>>;

export type RegisteredUnifiedAttachmentType =
  | UnifiedReferenceAttachmentType
  | UnifiedValueAttachmentType
  | UnifiedHybridAttachmentType;

export interface AttachmentFramework {
  registerExternalReference: (
    externalReferenceAttachmentType: ExternalReferenceAttachmentType
  ) => void;
  registerPersistableState: (
    persistableStateAttachmentType: PersistableStateAttachmentType
  ) => void;
  registerUnified: (unifiedAttachmentType: RegisteredUnifiedAttachmentType) => void;
}
