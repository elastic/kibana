/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ProposalAlreadyExistsError, ProposalConflictError } from '../services/errors';
import { handleRouteError } from './handle_route_error';

describe('handleRouteError', () => {
  it.each([
    ['a conflict', new ProposalConflictError('already decided')],
    ['an id that cannot be reused', new ProposalAlreadyExistsError('id is taken')],
  ])('should answer %s with a 409 carrying its message', (_label, error) => {
    const response = httpServerMock.createResponseFactory();

    handleRouteError(error, response, loggerMock.create());

    expect(response.conflict).toHaveBeenCalledWith({ body: { message: error.message } });
    expect(response.customError).not.toHaveBeenCalled();
  });
});
