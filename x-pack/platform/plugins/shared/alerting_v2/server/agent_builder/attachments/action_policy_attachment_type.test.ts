/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { VersionedAttachmentWithOrigin } from '@kbn/agent-builder-common/attachments';
import {
  ACTION_POLICY_ATTACHMENT_TYPE,
  type ActionPolicyAttachmentData,
} from '@kbn/alerting-v2-schemas';
import type { ActionPolicyClient } from '../../lib/action_policy_client/action_policy_client';
import { ALERTING_LOG_CODES } from '../../lib/errors/error_codes';
import { createLoggerService } from '../../lib/services/logger_service/logger_service.mock';
import { createActionPolicyAttachmentType } from './action_policy_attachment_type';

const basePolicyData: ActionPolicyAttachmentData = {
  id: 'policy-1',
  name: 'Notify on-call',
  description: 'Page on-call for critical episodes',
  enabled: true,
  destinations: [{ type: 'workflow', id: 'wf-1' }],
  matcher: { tags: ['ops-critical'] },
  group_by: null,
  tags: ['ops'],
  grouping_mode: 'per_episode',
  throttle: null,
  snoozed_until: null,
  updated_at: '2026-04-10T00:00:00.000Z',
};

type ActionPolicyVersionedAttachment = VersionedAttachmentWithOrigin<
  typeof ACTION_POLICY_ATTACHMENT_TYPE,
  ActionPolicyAttachmentData
>;

const buildVersionedAttachment = (
  overrides: Partial<ActionPolicyVersionedAttachment> = {}
): ActionPolicyVersionedAttachment => ({
  id: 'attach-1',
  type: ACTION_POLICY_ATTACHMENT_TYPE,
  current_version: 1,
  versions: [
    {
      version: 1,
      data: basePolicyData,
      created_at: '2026-04-10T00:00:00.000Z',
    } as never,
  ],
  origin: 'policy-1',
  origin_snapshot_at: '2026-04-10T00:00:00.000Z',
  ...overrides,
});

const SPACE_ID = 'default';

const createResolveContext = (spaceId: string = SPACE_ID) => ({
  ...agentBuilderMocks.attachments.createResolveContextMock(),
  spaceId,
});

describe('createActionPolicyAttachmentType', () => {
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let getActionPolicy: jest.Mock;
  let definition: AttachmentTypeDefinition<
    typeof ACTION_POLICY_ATTACHMENT_TYPE,
    ActionPolicyAttachmentData
  >;

  beforeEach(() => {
    ({ loggerService, mockLogger } = createLoggerService());
    getActionPolicy = jest.fn();
    const actionPolicyClient = { getActionPolicy } as unknown as ActionPolicyClient;
    definition = createActionPolicyAttachmentType({
      logger: loggerService,
      getActionPolicyClient: () => actionPolicyClient,
    });
  });

  describe('resolve', () => {
    it('returns policy data parsed against the schema', async () => {
      getActionPolicy.mockResolvedValueOnce(basePolicyData);

      const result = await definition.resolve!('policy-1', createResolveContext());

      expect(getActionPolicy).toHaveBeenCalledWith({ id: 'policy-1' });
      expect(result).toEqual(expect.objectContaining({ id: 'policy-1', name: 'Notify on-call' }));
    });

    it('returns undefined without logging when getActionPolicy returns 404', async () => {
      getActionPolicy.mockRejectedValueOnce(Boom.notFound('not found'));

      const result = await definition.resolve!('policy-missing', createResolveContext());

      expect(result).toBeUndefined();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('returns undefined and logs a warning when getActionPolicy throws unexpectedly', async () => {
      getActionPolicy.mockRejectedValueOnce(new Error('boom'));

      const result = await definition.resolve!('policy-missing', createResolveContext());

      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to resolve action policy attachment',
        expect.objectContaining({
          labels: {
            policy_id: 'policy-missing',
            space_id: SPACE_ID,
            code: ALERTING_LOG_CODES.AGENT_BUILDER_ACTION_POLICY_RESOLVE_FAILED,
          },
          error: expect.objectContaining({
            message: 'boom',
            type: 'Error',
          }),
        })
      );
    });
  });

  describe('isStale', () => {
    it('returns false without logging when getActionPolicy returns 404', async () => {
      getActionPolicy.mockRejectedValueOnce(Boom.notFound('not found'));

      const result = await definition.isStale!(buildVersionedAttachment(), createResolveContext());

      expect(result).toBe(false);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('returns false and logs a warning when getActionPolicy throws', async () => {
      getActionPolicy.mockRejectedValueOnce(new Error('boom'));

      const result = await definition.isStale!(buildVersionedAttachment(), createResolveContext());

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to check action policy attachment staleness',
        expect.objectContaining({
          labels: {
            policy_id: 'policy-1',
            space_id: SPACE_ID,
            code: ALERTING_LOG_CODES.AGENT_BUILDER_ACTION_POLICY_STALENESS_CHECK_FAILED,
          },
          error: expect.objectContaining({
            message: 'boom',
            type: 'Error',
          }),
        })
      );
    });
  });
});
