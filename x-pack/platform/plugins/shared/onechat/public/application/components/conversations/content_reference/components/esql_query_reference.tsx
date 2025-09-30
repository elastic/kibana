/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlContentReference } from '@kbn/onechat-common/chat/conversation';
import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import { useOnechatServices } from '../../../../hooks/use_onechat_service';
import { useKibana } from '../../../../hooks/use_kibana';
import type { ResolvedContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';

interface Props {
  contentReferenceNode: ResolvedContentReferenceNode<EsqlContentReference>;
}

export const EsqlQueryReference: React.FC<Props> = ({ contentReferenceNode }) => {
  const { startDependencies } = useOnechatServices();
  const { share } = startDependencies;
  const { services: { application } } = useKibana();
  
  const discoverLocator = share.url.locators.get('DISCOVER_APP_LOCATOR');

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

      application.navigateToApp(url.app, {
        path: url.path,
        openInNewTab: true,
      });
    },
    [discoverLocator, contentReferenceNode, application]
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
