/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ArtifactType {
  visualization = 'visualization',
  dashboard = 'dashboard',
  query = 'query',
  text = 'text',
}

/**
 *
 */
export interface TextArtifact {
  /** type of content */
  type?: 'text' | 'json';
  /** raw content*/
  content: string;
}

/// attachment







export interface InlineAttachment {}

export interface ReferenceAttachment {
  // type of the target
  // id of the target
}


