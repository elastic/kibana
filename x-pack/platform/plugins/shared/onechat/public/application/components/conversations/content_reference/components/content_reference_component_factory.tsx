/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EsqlContentReference,
  HrefContentReference,
  ProductDocumentationContentReference,
} from '@kbn/elastic-assistant-common';
import React from 'react';
import type {
  ContentReferenceNode,
  ResolvedContentReferenceNode,
} from '../content_reference_parser';
import { ContentReferenceButton } from './content_reference_button';
import { ProductDocumentationReference } from './product_documentation_reference';
import { EsqlQueryReference } from './esql_query_reference';
import { HrefReference } from './href_reference';
import { contentReferenceRegistry } from '../content_reference_registry';

export interface Props {
  contentReferencesVisible?: boolean;
  contentReferenceNode: ContentReferenceNode;
}

export const ContentReferenceComponentFactory: React.FC<Props> = ({
  contentReferencesVisible = true,
  contentReferenceNode,
}: Props) => {
  if (!contentReferencesVisible) return null;

  if (contentReferenceNode.contentReferenceCount === undefined) return null;

  if (contentReferenceNode.contentReference === undefined) {
    return (
      <ContentReferenceButton
        disabled
        contentReferenceCount={contentReferenceNode.contentReferenceCount}
      />
    );
  }

  const { type } = contentReferenceNode.contentReference;

  // Check if there's a registered component for this type
  const RegisteredComponent = contentReferenceRegistry.get(type);
  if (RegisteredComponent) {
    return (
      <RegisteredComponent
        contentReferenceNode={contentReferenceNode as ResolvedContentReferenceNode<any>}
      />
    );
  }

  // Fallback to built-in components
  switch (type) {
    case 'ProductDocumentation':
      return (
        <ProductDocumentationReference
          contentReferenceNode={
            contentReferenceNode as ResolvedContentReferenceNode<ProductDocumentationContentReference>
          }
        />
      );
    case 'EsqlQuery': {
      return (
        <EsqlQueryReference
          contentReferenceNode={
            contentReferenceNode as ResolvedContentReferenceNode<EsqlContentReference>
          }
        />
      );
    }
    case 'Href': {
      return (
        <HrefReference
          contentReferenceNode={
            contentReferenceNode as ResolvedContentReferenceNode<HrefContentReference>
          }
        />
      );
    }
    default:
      const _exhaustiveCheck: never = contentReferenceNode.contentReference as never;
      throw new Error(`Unhandled case: ${_exhaustiveCheck}`);
  }
};
