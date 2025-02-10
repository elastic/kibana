/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import {
  ExecutionResponseItem,
  ExecutionResponseType,
} from '@kbn/actions-plugin/server/create_execute_function';
import type { Logger } from '@kbn/core/server';
import type { EmailService, PlainTextEmail, HTMLEmail } from './types';

export class ConnectorsEmailService implements EmailService {
  constructor(
    private requesterId: string,
    private connectorId: string,
    private actionsClient: IUnsecuredActionsClient,
    private logger: Logger
  ) {}

  async sendPlainTextEmail(params: PlainTextEmail): Promise<void> {
    const actions = params.to.map((to) => ({
      id: this.connectorId,
      params: {
        to: [to],
        subject: params.subject,
        message: params.message,
      },
      relatedSavedObjects: params.context?.relatedObjects,
    }));

    const response = await this.actionsClient.bulkEnqueueExecution(this.requesterId, actions);
    if (response.errors) {
      this.logEnqueueExecutionResponse(response.items);
    }
  }

  async sendHTMLEmail(params: HTMLEmail): Promise<void> {
    const actions = params.to.map((to) => ({
      id: this.connectorId,
      params: {
        to: [to],
        subject: params.subject,
        message: params.message,
        messageHTML: params.messageHTML,
      },
      relatedSavedObjects: params.context?.relatedObjects,
    }));

    const response = await this.actionsClient.bulkEnqueueExecution(this.requesterId, actions);
    if (response.errors) {
      this.logEnqueueExecutionResponse(response.items);
    }
  }

  private logEnqueueExecutionResponse(items: ExecutionResponseItem[]) {
    for (const r of items) {
      if (r.response === ExecutionResponseType.QUEUED_ACTIONS_LIMIT_ERROR) {
        this.logger.warn(
          `Skipped scheduling action "${r.id}" because the maximum number of queued actions has been reached.`
        );
      }
    }
  }
}
