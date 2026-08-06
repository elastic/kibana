/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum McpLogoPickerTab {
  SELECT = 'select',
  UPLOAD = 'upload',
}

export interface NoneClientLogo {
  type: 'none';
}

export interface SelectClientLogo {
  type: 'select';
  id: string;
  dataUrl: string;
}

export interface UploadClientLogo {
  type: 'upload';
  file: File;
  dataUrl: string;
}

export type ClientLogo = NoneClientLogo | SelectClientLogo | UploadClientLogo;

export const NO_CLIENT_LOGO: NoneClientLogo = { type: 'none' };

export enum RedirectUriType {
  LOCAL = 'local',
  REMOTE = 'remote',
}

export interface RedirectUri {
  value: string;
}

export interface RedirectUriConfig {
  type: RedirectUriType;
  uris: Array<RedirectUri>;
}

export interface McpClientFormData {
  clientName: string;
  clientLogo: ClientLogo;
  redirect: RedirectUriConfig;
  isConfidential: boolean;
}
