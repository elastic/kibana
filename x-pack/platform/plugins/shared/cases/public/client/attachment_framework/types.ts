/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { EuiCommentProps, IconType, EuiButtonProps } from '@elastic/eui';
import type {
  ExternalReferenceAttachmentPayload,
  PersistableStateAttachmentPayload,
} from '../../../common/types/domain';
import type { CaseUI } from '../../containers/types';

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
  children?: React.LazyExoticComponent<React.FC<Props>>;
  hideDefaultActions?: boolean;
}

export interface CommonAttachmentViewProps {
  attachmentId: string;
  caseData: Pick<CaseUI, 'id' | 'title'>;
}

export interface ExternalReferenceAttachmentViewProps extends CommonAttachmentViewProps {
  externalReferenceId: ExternalReferenceAttachmentPayload['externalReferenceId'];
  externalReferenceMetadata: ExternalReferenceAttachmentPayload['externalReferenceMetadata'];
}

export interface PersistableStateAttachmentViewProps extends CommonAttachmentViewProps {
  persistableStateAttachmentTypeId: PersistableStateAttachmentPayload['persistableStateAttachmentTypeId'];
  persistableStateAttachmentState: PersistableStateAttachmentPayload['persistableStateAttachmentState'];
}

/**
 * View props for reference-based unified attachments (e.g., alerts, events)
 * These attachments reference external entities by ID
 */
export interface UnifiedReferenceAttachmentViewProps extends CommonAttachmentViewProps {
  attachmentId: string;
  metadata?: Record<string, unknown>;
}

/**
 * View props for value-based unified attachments (e.g., lens, user comments)
 * These attachments contain data/content directly
 */
export interface UnifiedValueAttachmentViewProps extends CommonAttachmentViewProps {
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * @deprecated Use UnifiedReferenceAttachmentViewProps or UnifiedValueAttachmentViewProps instead
 * Kept for backward compatibility during migration
 */
export interface UnifiedAttachmentViewProps extends CommonAttachmentViewProps {
  attachmentId: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AttachmentType<Props> {
  id: string;
  icon: IconType;
  displayName: string;
  getAttachmentViewObject: (props: Props) => AttachmentViewObject<Props>;
  getAttachmentRemovalObject?: (props: Props) => Pick<AttachmentViewObject<Props>, 'event'>;
}

export type ExternalReferenceAttachmentType = AttachmentType<ExternalReferenceAttachmentViewProps>;
export type PersistableStateAttachmentType = AttachmentType<PersistableStateAttachmentViewProps>;
export type UnifiedReferenceAttachmentType = AttachmentType<UnifiedReferenceAttachmentViewProps>;
export type UnifiedValueAttachmentType = AttachmentType<UnifiedValueAttachmentViewProps>;
export type UnifiedAttachmentType = UnifiedReferenceAttachmentType | UnifiedValueAttachmentType;

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
