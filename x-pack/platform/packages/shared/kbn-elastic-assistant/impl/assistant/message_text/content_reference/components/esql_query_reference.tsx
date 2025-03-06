/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlContentReference } from '@kbn/elastic-assistant-common';
import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import type { ResolvedContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';
import { useAssistantContext } from '../../../../..';

interface Props {
  contentReferenceNode: ResolvedContentReferenceNode<EsqlContentReference>;
}

export const EsqlQueryReference: React.FC<Props> = ({ contentReferenceNode }) => {
  const { discoverLocator, navigateToApp } = useAssistantContext();
  const onClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (!discoverLocator) {
        return;
      }
      const url = await discoverLocator.getLocation({
        query: {
          esql: contentReferenceNode.contentReference.query,
        },
        timeRange: contentReferenceNode.contentReference.timerange,
      });

      navigateToApp(url.app, {
        path: url.path,
        openInNewTab: true,
      });
    },
    [discoverLocator, contentReferenceNode, navigateToApp]
  );

  return (
    <PopoverReference
      contentReferenceCount={contentReferenceNode.contentReferenceCount}
      data-test-subj="EsqlQueryReference"
    >
      <EuiLink onClick={onClick}>{contentReferenceNode.contentReference.label}</EuiLink>
    </PopoverReference>
  );
};
