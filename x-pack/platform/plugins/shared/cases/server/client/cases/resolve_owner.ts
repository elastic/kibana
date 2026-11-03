/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { GENERAL_CASES_OWNER } from '../../../common/constants';
import type { CasePostRequest } from '../../../common/types/api';
import { isTopLevelAppEnabled } from '../../common/top_level_app';

/** A create request whose `owner` may be omitted when Cases runs as the top-level app. */
export type CasePostRequestWithOptionalOwner = Omit<CasePostRequest, 'owner'> & {
  owner?: CasePostRequest['owner'];
};

/**
 * Picks the owner (the solution a case comes from) for a new case: the request's owner, then the
 * template's owner, then the only owner in the deployment, then the stack owner. With the
 * top-level app off the owner stays required.
 */
export const resolveCaseOwner = async ({
  request,
  registeredOwners,
  getTemplateOwner,
}: {
  request: CasePostRequestWithOptionalOwner;
  registeredOwners: string[];
  getTemplateOwner: (templateId: string) => Promise<string | undefined>;
}): Promise<string> => {
  if (request.owner != null) {
    return request.owner;
  }

  if (!isTopLevelAppEnabled()) {
    throw Boom.badRequest('Owner is required.');
  }

  const templateId = request.template?.id;
  const templateOwner = templateId ? await getTemplateOwner(templateId) : undefined;
  if (templateOwner != null) {
    return templateOwner;
  }

  if (registeredOwners.length === 1) {
    return registeredOwners[0];
  }

  if (registeredOwners.includes(GENERAL_CASES_OWNER)) {
    return GENERAL_CASES_OWNER;
  }

  throw Boom.badRequest(
    `Specify the owner of the case. It must be one of: ${registeredOwners.join(', ')}.`
  );
};
