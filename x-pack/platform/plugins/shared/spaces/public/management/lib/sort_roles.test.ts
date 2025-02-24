/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin-types-common';

import { sortRolesForListing } from './sort_roles';

const createCustom = (name: string): Role => {
  return {
    name,
    metadata: { _reserved: false },
  } as unknown as Role;
};

const createReserved = (name: string): Role => {
  return {
    name,
    metadata: { _reserved: true },
  } as unknown as Role;
};

const expected = [
  'Apple',
  'Banana',
  'Cherry',
  'Date',
  'Elderberry',
  'Fig',
  'Grape',
  'Honeydew melon',
  'Indian fig',
  'Jackfruit',
  'Kiwi',
  'Lemon',
  'Mango',
  'Nectarine',
  'Orange',
  'Papaya',
  'Quince',
  'Raspberry',
  'Strawberry',
  'Tangerine',
  'Artichoke',
  'Broccoli',
  'Carrot',
  'Daikon',
  'Eggplant',
  'Fennel',
  'Garlic',
  'Horseradish',
  'Iceberg lettuce',
  'Jalapeño',
  'Kale',
  'Leek',
  'Mushroom',
  'Napa cabbage',
  'Okra',
  'Parsnip',
  'Quinoa greens',
  'Radish',
  'Spinach',
  'Turnip',
];

describe('sortRolesForListing: sorts the roles correctly', () => {
  it('when they are originally sorted alphabetically', () => {
    const roles = [
      createCustom('Apple'),
      createReserved('Artichoke'),
      createCustom('Banana'),
      createReserved('Broccoli'),
      createReserved('Carrot'),
      createCustom('Cherry'),
      createReserved('Daikon'),
      createCustom('Date'),
      createReserved('Eggplant'),
      createCustom('Elderberry'),
      createReserved('Fennel'),
      createCustom('Fig'),
      createReserved('Garlic'),
      createCustom('Grape'),
      createCustom('Honeydew melon'),
      createReserved('Horseradish'),
      createReserved('Iceberg lettuce'),
      createCustom('Indian fig'),
      createCustom('Jackfruit'),
      createReserved('Jalapeño'),
      createReserved('Kale'),
      createCustom('Kiwi'),
      createReserved('Leek'),
      createCustom('Lemon'),
      createCustom('Mango'),
      createReserved('Mushroom'),
      createReserved('Napa cabbage'),
      createCustom('Nectarine'),
      createReserved('Okra'),
      createCustom('Orange'),
      createCustom('Papaya'),
      createReserved('Parsnip'),
      createCustom('Quince'),
      createReserved('Quinoa greens'),
      createReserved('Radish'),
      createCustom('Raspberry'),
      createReserved('Spinach'),
      createCustom('Strawberry'),
      createCustom('Tangerine'),
      createReserved('Turnip'),
    ];

    const sortResult = roles.sort(sortRolesForListing);
    const names = sortResult.map(({ name }) => name);

    // expect fruits to be at the top, otherwise sorted alphabetically
    expect(names).toEqual(expected);
  });

  it('when they are originally sorted randomly', () => {
    const roles = [
      createReserved('Iceberg lettuce'),
      createCustom('Nectarine'),
      createCustom('Strawberry'),
      createReserved('Jalapeño'),
      createCustom('Papaya'),
      createReserved('Fennel'),
      createCustom('Lemon'),
      createCustom('Grape'),
      createReserved('Artichoke'),
      createCustom('Apple'),
      createReserved('Quinoa greens'),
      createCustom('Quince'),
      createCustom('Raspberry'),
      createReserved('Leek'),
      createReserved('Radish'),
      createReserved('Daikon'),
      createReserved('Turnip'),
      createCustom('Elderberry'),
      createCustom('Tangerine'),
      createReserved('Broccoli'),
      createReserved('Mushroom'),
      createCustom('Honeydew melon'),
      createCustom('Kiwi'),
      createCustom('Fig'),
      createCustom('Mango'),
      createCustom('Banana'),
      createCustom('Jackfruit'),
      createReserved('Napa cabbage'),
      createReserved('Spinach'),
      createCustom('Orange'),
      createReserved('Okra'),
      createReserved('Eggplant'),
      createReserved('Kale'),
      createCustom('Cherry'),
      createReserved('Horseradish'),
      createReserved('Garlic'),
      createReserved('Carrot'),
      createCustom('Date'),
      createReserved('Parsnip'),
      createCustom('Indian fig'),
    ];

    const sortResult = roles.sort(sortRolesForListing);
    const names = sortResult.map(({ name }) => name);

    // expect fruits to be at the top, otherwise sorted alphabetically
    expect(names).toEqual(expected);
  });
});
