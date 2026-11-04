/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { ConnectorTypeDraftAttachment } from '../../../common/attachments';
import { CONNECTOR_TYPE_DRAFT_ATTACHMENT_TYPE } from '../../../common/attachments';
import {
  CONNECTOR_TYPE_DRAFT_QUERY_PARAM,
  CONNECTOR_TYPE_DRAFT_STORAGE_PREFIX,
} from '@kbn/triggers-actions-ui-plugin/public/common/connector_type_draft_handoff';
import { createConnectorTypeDraftAttachmentDefinition } from './connector_type_draft_attachment';

describe('connector type draft attachment', () => {
  it('hands the draft to the Connectors page without putting it in the URL', () => {
    const navigateToApp = jest.fn();
    const definition = createConnectorTypeDraftAttachmentDefinition({
      application: { navigateToApp } as unknown as CoreStart['application'],
      notifications: { toasts: { addDanger: jest.fn() } } as unknown as CoreStart['notifications'],
    });
    const draft = {
      id: 'jsonplaceholder',
      displayName: 'JSONPlaceholder',
      description: 'Read posts',
      config: [],
      auth: { type: 'none' },
      actions: {
        getPosts: {
          description: 'Get posts',
          scope: 'read',
          input: [],
          request: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts' },
        },
      },
    };
    const attachment = {
      id: 'attachment-1',
      type: CONNECTOR_TYPE_DRAFT_ATTACHMENT_TYPE,
      data: { draft, documentation_url: 'https://jsonplaceholder.typicode.com/' },
    } as unknown as ConnectorTypeDraftAttachment;
    const buttons = definition.getActionButtons!({
      attachment,
      isCanvas: false,
      isSidebar: false,
      updateOrigin: jest.fn(),
    });

    buttons[0].handler();

    expect(
      JSON.parse(sessionStorage.getItem(`${CONNECTOR_TYPE_DRAFT_STORAGE_PREFIX}attachment-1`) ?? '')
    ).toEqual(draft);
    expect(navigateToApp).toHaveBeenCalledWith('management', {
      path: `/insightsAndAlerting/triggersActionsConnectors/connectors?${CONNECTOR_TYPE_DRAFT_QUERY_PARAM}=attachment-1`,
    });
  });
});
