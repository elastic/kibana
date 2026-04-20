/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectionOption } from '@kbn/workflows';
import { setCategoryStepDefinition } from './set_category';
import { getCategories } from '../containers/api';

jest.mock('../containers/api', () => ({
  getCategories: jest.fn(),
}));

describe('setCategoryStepDefinition', () => {
  const getCategoriesMock = jest.mocked(getCategories);

  const createSelectionContext = (owner?: string) => ({
    stepType: 'cases.setCategory' as const,
    scope: 'input' as const,
    propertyKey: 'category',
    values: {
      input: owner === undefined ? {} : { owner },
    },
  });

  const defaultCategories = ['Malware', 'Phishing', 'Ransomware', 'Data Breach'];

  const setup = (categories: string[] = defaultCategories) => {
    interface SelectionHandler {
      search: (input: string, context: unknown) => Promise<SelectionOption<string>[]>;
      resolve: (value: string, context: unknown) => Promise<SelectionOption | null>;
      getDetails: (
        value: string,
        context: unknown,
        option: unknown
      ) => Promise<{ message: string }>;
    }

    getCategoriesMock.mockResolvedValue(categories);

    const definition = setCategoryStepDefinition;
    const inputHandlers = (definition.editorHandlers?.input ?? {}) as Record<
      string,
      { selection?: SelectionHandler }
    >;

    return {
      definition,
      categorySelection: inputHandlers.category?.selection,
    };
  };

  it('returns a public step definition with expected metadata', () => {
    const { definition } = setup();

    expect(definition.id).toBe('cases.setCategory');
    expect(definition.category).toBe('kibana.cases');
    expect(definition.documentation?.examples?.length).toBeGreaterThan(0);
  });

  it('searches all categories when query is empty', async () => {
    const { categorySelection } = setup();

    const results = await categorySelection!.search(
      '   ',
      createSelectionContext('securitySolution')
    );

    expect(results).toEqual([
      { value: 'Malware', label: 'Malware' },
      { value: 'Phishing', label: 'Phishing' },
      { value: 'Ransomware', label: 'Ransomware' },
      { value: 'Data Breach', label: 'Data Breach' },
    ]);
    expect(getCategoriesMock).toHaveBeenCalledWith({ owner: ['securitySolution'] });
  });

  it('filters categories by query text', async () => {
    const { categorySelection } = setup();

    const results = await categorySelection!.search(
      'ware',
      createSelectionContext('securitySolution')
    );

    expect(results).toEqual([
      { value: 'Malware', label: 'Malware' },
      { value: 'Ransomware', label: 'Ransomware' },
    ]);
  });

  it('resolves a specific category value', async () => {
    const { categorySelection } = setup();

    const resolved = await categorySelection!.resolve(
      'Phishing',
      createSelectionContext('securitySolution')
    );

    expect(resolved).toEqual({ value: 'Phishing', label: 'Phishing' });
  });

  it('returns null when resolving a category not in the list', async () => {
    const { categorySelection } = setup();

    const resolved = await categorySelection!.resolve(
      'Unknown',
      createSelectionContext('securitySolution')
    );

    expect(resolved).toBeNull();
  });

  it('returns at most 15 categories when the search query is empty', async () => {
    const manyCategories = Array.from({ length: 16 }, (_, i) => `Category ${i}`);
    const { categorySelection } = setup(manyCategories);

    const results = await categorySelection!.search('', createSelectionContext('securitySolution'));

    expect(results).toHaveLength(15);
  });

  it('finds a category after index 14 when the search query is non-empty', async () => {
    const manyCategories = [
      ...Array.from({ length: 15 }, (_, i) => `Unrelated ${i}`),
      'OnlyUniqueTailMatch',
    ];
    const { categorySelection } = setup(manyCategories);

    const results = await categorySelection!.search(
      'uniquetail',
      createSelectionContext('securitySolution')
    );

    expect(results).toEqual([{ value: 'OnlyUniqueTailMatch', label: 'OnlyUniqueTailMatch' }]);
  });

  it('does not fetch categories when owner is not provided', async () => {
    const { categorySelection } = setup();

    const results = await categorySelection!.search('', createSelectionContext());

    expect(results).toEqual([]);
    expect(getCategoriesMock).not.toHaveBeenCalled();
  });

  it('does not fetch categories when owner is invalid', async () => {
    const { categorySelection } = setup();

    const results = await categorySelection!.search('', createSelectionContext('notAValidOwner'));

    expect(results).toEqual([]);
    expect(getCategoriesMock).not.toHaveBeenCalled();
  });

  it('does not fetch categories when owner is empty string', async () => {
    const { categorySelection } = setup();

    const results = await categorySelection!.search('', createSelectionContext(''));

    expect(results).toEqual([]);
    expect(getCategoriesMock).not.toHaveBeenCalled();
  });

  it('returns a freeform category option when owner is missing and search text is non-empty', async () => {
    const { categorySelection } = setup();

    const results = await categorySelection!.search('Custom Category', createSelectionContext());

    expect(results).toEqual([{ value: 'Custom Category', label: 'Custom Category' }]);
    expect(getCategoriesMock).not.toHaveBeenCalled();
  });

  it('resolves any category value when owner is missing', async () => {
    const { categorySelection } = setup();

    const resolved = await categorySelection!.resolve('Unknown', createSelectionContext());

    expect(resolved).toEqual({ value: 'Unknown', label: 'Unknown' });
    expect(getCategoriesMock).not.toHaveBeenCalled();
  });

  it('resolves any category value when owner is invalid', async () => {
    const { categorySelection } = setup();

    const resolved = await categorySelection!.resolve(
      'NotInApi',
      createSelectionContext('notAValidOwner')
    );

    expect(resolved).toEqual({ value: 'NotInApi', label: 'NotInApi' });
    expect(getCategoriesMock).not.toHaveBeenCalled();
  });

  it('uses owner filter when a valid owner is provided', async () => {
    const { categorySelection } = setup();

    await categorySelection!.search('', createSelectionContext('observability'));

    expect(getCategoriesMock).toHaveBeenCalledWith({ owner: ['observability'] });
  });

  it('returns details message for a resolved category', async () => {
    const { categorySelection } = setup();

    const details = await categorySelection!.getDetails('Malware', createSelectionContext(), {
      value: 'Malware',
      label: 'Malware',
    });

    expect(details.message).toContain('Malware');
    expect(details.message).toContain('can be set');
  });

  it('returns not-found message when category option is null', async () => {
    const { categorySelection } = setup();

    const details = await categorySelection!.getDetails(
      'UnknownCategory',
      createSelectionContext(),
      null
    );

    expect(details.message).toContain('UnknownCategory');
    expect(details.message).toContain('not found');
  });

  it('propagates API errors from getCategories', async () => {
    const error = new Error('categories fetch failed');
    const { categorySelection } = setup();
    getCategoriesMock.mockRejectedValueOnce(error);

    await expect(
      categorySelection!.search('Malware', createSelectionContext('securitySolution'))
    ).rejects.toThrow(error.message);
  });

  afterEach(() => {
    getCategoriesMock.mockReset();
  });
});
