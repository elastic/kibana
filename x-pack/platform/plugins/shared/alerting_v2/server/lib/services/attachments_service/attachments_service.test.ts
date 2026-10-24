/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { AttachmentsService } from './attachments_service';

describe('AttachmentsService', () => {
  it('returns a client bound to the given attachment state manager', () => {
    const { attachments } = agentBuilderMocks.tools.createHandlerContext();
    attachments.getActive.mockReturnValue([
      {
        id: 'rule-att',
        type: RULE_ATTACHMENT_TYPE,
        current_version: 1,
        versions: [{ version: 1, data: { metadata: { name: 'r' } } }],
      } as never,
    ]);

    const client = new AttachmentsService().getClient(attachments);

    expect(client.rules.list().map(({ id }) => id)).toEqual(['rule-att']);
    expect(attachments.getActive).toHaveBeenCalled();
  });
});
