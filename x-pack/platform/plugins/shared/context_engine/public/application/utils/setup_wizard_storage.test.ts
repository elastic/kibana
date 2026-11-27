/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SETUP_WIZARD_STORAGE_KEY,
  readSetupWizardStoredValue,
  removeSetupWizardStoredValue,
  writeSetupWizardStoredValue,
} from './setup_wizard_storage';

describe('setup wizard storage', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  const readStoredObject = () =>
    JSON.parse(window.localStorage.getItem(SETUP_WIZARD_STORAGE_KEY) ?? 'null');

  it('keeps every AI index in one object, with the space in each entry', () => {
    writeSetupWizardStoredValue({ basePath: '', aiIndexId: 'support' }, 'sources');
    writeSetupWizardStoredValue({ basePath: '/s/marketing', aiIndexId: 'support' }, 'closed');

    expect(readStoredObject()).toEqual({
      '/support': 'sources',
      '/s/marketing/support': 'closed',
    });
    expect(readSetupWizardStoredValue({ basePath: '', aiIndexId: 'support' })).toBe('sources');
    expect(readSetupWizardStoredValue({ basePath: '/s/marketing', aiIndexId: 'support' })).toBe(
      'closed'
    );
  });

  it('removes one entry, and the whole key with the last one', () => {
    writeSetupWizardStoredValue({ basePath: '', aiIndexId: 'support' }, 'sources');
    writeSetupWizardStoredValue({ basePath: '', aiIndexId: 'billing' }, 'closed');

    removeSetupWizardStoredValue({ basePath: '', aiIndexId: 'support' });
    expect(readStoredObject()).toEqual({ '/billing': 'closed' });

    removeSetupWizardStoredValue({ basePath: '', aiIndexId: 'billing' });
    expect(window.localStorage.getItem(SETUP_WIZARD_STORAGE_KEY)).toBeNull();
  });

  it('keeps the value in memory when local storage is blocked', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    writeSetupWizardStoredValue({ basePath: '', aiIndexId: 'blocked' }, 'describe');

    expect(readSetupWizardStoredValue({ basePath: '', aiIndexId: 'blocked' })).toBe('describe');
    setItem.mockRestore();
    removeSetupWizardStoredValue({ basePath: '', aiIndexId: 'blocked' });
    expect(readSetupWizardStoredValue({ basePath: '', aiIndexId: 'blocked' })).toBeUndefined();
  });

  it.each([
    ['not JSON', '{not json'],
    ['not an object', '"sources"'],
    ['an array', '["sources"]'],
  ])('deletes a stored value that is %s', (_label, raw) => {
    window.localStorage.setItem(SETUP_WIZARD_STORAGE_KEY, raw);

    expect(readSetupWizardStoredValue({ basePath: '', aiIndexId: 'support' })).toBeUndefined();
    expect(window.localStorage.getItem(SETUP_WIZARD_STORAGE_KEY)).toBeNull();
  });

  it('ignores an entry that is not a string and drops it on the next write', () => {
    window.localStorage.setItem(
      SETUP_WIZARD_STORAGE_KEY,
      JSON.stringify({ '/support': 9, '/billing': 'closed' })
    );

    expect(readSetupWizardStoredValue({ basePath: '', aiIndexId: 'support' })).toBeUndefined();

    writeSetupWizardStoredValue({ basePath: '', aiIndexId: 'orders' }, 'sources');
    expect(readStoredObject()).toEqual({ '/billing': 'closed', '/orders': 'sources' });
  });
});
