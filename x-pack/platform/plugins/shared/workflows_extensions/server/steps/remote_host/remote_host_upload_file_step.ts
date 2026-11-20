/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { uploadFile } from './execute_in_connector';
import { remoteHostUploadFileStepCommonDefinition } from '../../../common/steps/remote_host';
import { createServerStepDefinition } from '../../step_registry/types';

interface Deps {
  getActionsStart: () => ActionsPluginStartContract | undefined;
}

export const createRemoteHostUploadFileStepDefinition = ({ getActionsStart }: Deps) =>
  createServerStepDefinition({
    ...remoteHostUploadFileStepCommonDefinition,
    handler: async (context) => {
      const { remotePath, content } = context.input;
      const connectorId = context.config['connector-id'];

      await uploadFile(
        {
          connectorId,
          request: context.contextManager.getFakeRequest(),
          actionsStart: getActionsStart(),
          abortSignal: context.abortSignal,
        },
        { remotePath, content }
      );

      return { output: null };
    },
  });
