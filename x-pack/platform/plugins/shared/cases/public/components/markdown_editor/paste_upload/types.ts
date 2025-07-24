/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DoneNotification } from '@kbn/shared-ux-file-upload/src/upload_state';

export enum UploadPhase {
  IDLE = 'idle',
  START_UPLOAD = 'start_upload',
  UPLOADING = 'uploading',
  FINISHED = 'finished',
}

export type PasteUploadState =
  | UploadIdleState
  | UploadStartState
  | UploadInProgressState
  | UploadFinishedState;

export interface UploadIdleState {
  phase: UploadPhase.IDLE;
}

export interface UploadStartState {
  phase: UploadPhase.START_UPLOAD;
  filename: string;
  placeholder: string;
}

export interface UploadInProgressState {
  phase: UploadPhase.UPLOADING;
  filename: string;
  placeholder: string;
}

export interface UploadFinishedState {
  phase: UploadPhase.FINISHED;
  file: DoneNotification;
  placeholder: string;
}

export enum ActionType {
  RESET = 'RESET',
  START_UPLOAD = 'START_UPLOAD',
  UPLOAD_IN_PROGRESS = 'UPLOAD_IN_PROGRESS',
  UPLOAD_FINISHED = 'UPLOAD_FINISHED',
}

export type Action =
  | { type: ActionType.START_UPLOAD; filename: string; placeholder: string }
  | { type: ActionType.UPLOAD_IN_PROGRESS; filename: string; placeholder: string }
  | { type: ActionType.UPLOAD_FINISHED; file: DoneNotification; placeholder: string }
  | { type: ActionType.RESET };
