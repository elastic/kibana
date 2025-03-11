/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getName } from './display_name';

describe('getName', () => {
  it('returns unknown when the user is undefined', () => {
    expect(getName()).toBe('Unknown');
  });

  it('returns the full name', () => {
    expect(getName({ full_name: 'name', username: 'username' })).toBe('name');
  });

  it('returns the email if the full name is empty', () => {
    expect(getName({ full_name: '', email: 'email', username: 'username' })).toBe('email');
  });

  it('returns the email if the full name is undefined', () => {
    expect(getName({ email: 'email', username: 'username' })).toBe('email');
  });

  it('returns the username if the full name and email are empty', () => {
    expect(getName({ full_name: '', email: '', username: 'username' })).toBe('username');
  });

  it('returns the username if the full name and email are undefined', () => {
    expect(getName({ username: 'username' })).toBe('username');
  });

  it('returns the username is empty', () => {
    expect(getName({ username: '' })).toBe('Unknown');
  });
});
