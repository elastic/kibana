/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExternalServiceIncidentResponse,
  ExternalServiceApi,
  Incident,
  PushToServiceApiHandlerArgs,
  PushToServiceResponse,
} from './types';

const pushToServiceHandler = async ({
  externalService,
  params,
}: PushToServiceApiHandlerArgs): Promise<ExternalServiceIncidentResponse> => {
  const { comments } = params;
  let res: PushToServiceResponse;
  const { externalId, ...rest } = params.incident;
  const incident: Incident = rest;

  if (externalId != null) {
    res = await externalService.updateRecord({
      incidentId: externalId,
      incident,
    });
  } else {
    res = await externalService.createRecord({ incident });
  }

  const createdDate = new Date().toISOString();

  if (comments && Array.isArray(comments) && comments.length > 0) {
    res.comments = [];
    for (const currentComment of comments) {
      const comment = await externalService.createComment({
        incidentId: res.id,
        comment: currentComment,
        createdDate,
      });

      res.comments = [
        ...(res.comments ?? []),
        {
          commentId: comment.commentId,
          pushedDate: comment.pushedDate,
        },
      ];
    }
  }

  return res;
};

export const api: ExternalServiceApi = {
  pushToService: pushToServiceHandler,
};
