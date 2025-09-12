/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { ContentReferences } from '@kbn/elastic-assistant-common';
import type {
  ContentReferenceNode,
  ResolvedContentReferenceNode,
} from './content_reference_parser';

/** While a message is being streamed, content references are null. When a message has finished streaming, content references are either defined or undefined */
export type StreamingOrFinalContentReferences = ContentReferences | undefined | null;

export interface ContentReferenceComponentProps {
  contentReferencesVisible: boolean;
  contentReferenceNode: ContentReferenceNode;
}

export type ContentReferenceComponent = React.FC<ContentReferenceComponentProps>;

export interface ContentReferenceRegistry {
  register<T extends ContentReferences>(
    type: T['type'],
    component: React.FC<{ contentReferenceNode: ResolvedContentReferenceNode<T> }>
  ): void;
  unregister(type: string): void;
  get(
    type: string
  ): React.FC<{ contentReferenceNode: ResolvedContentReferenceNode<any> }> | undefined;
  has(type: string): boolean;
  list(): string[];
}

export class ContentReferenceRegistryImpl implements ContentReferenceRegistry {
  private components = new Map<
    string,
    React.FC<{ contentReferenceNode: ResolvedContentReferenceNode<any> }>
  >();

  register<T extends ContentReferences>(
    type: T['type'],
    component: React.FC<{ contentReferenceNode: ResolvedContentReferenceNode<T> }>
  ): void {
    this.components.set(type, component);
  }

  unregister(type: string): void {
    this.components.delete(type);
  }

  get(
    type: string
  ): React.FC<{ contentReferenceNode: ResolvedContentReferenceNode<any> }> | undefined {
    return this.components.get(type);
  }

  has(type: string): boolean {
    return this.components.has(type);
  }

  list(): string[] {
    return Array.from(this.components.keys());
  }
}

export const contentReferenceRegistry = new ContentReferenceRegistryImpl();
