/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentNotFoundError,
  AttachmentConflictError,
  AttachmentValidationError,
} from './errors';

describe('attachment public client errors', () => {
  it('AttachmentNotFoundError carries name and message', () => {
    const err = new AttachmentNotFoundError('a1');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AttachmentNotFoundError');
    expect(err.message).toContain('a1');
  });

  it('AttachmentConflictError carries name and message', () => {
    const err = new AttachmentConflictError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AttachmentConflictError');
    expect(err.message).toBe('boom');
  });

  it('AttachmentValidationError carries name and message', () => {
    const err = new AttachmentValidationError('bad');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AttachmentValidationError');
    expect(err.message).toBe('bad');
  });
});
