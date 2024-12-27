/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IntegrationCardItem } from '../../screens/home';

import { _promoteFeaturedIntegrations } from './promote_featured_integrations';

const mockCard = (name: string) =>
  ({
    id: `epr:${name}`,
    description: 'description',
    icons: [],
    title: name,
    url: `/app/integrations/detail/${name}-1.0.0/overview`,
    integration: '',
    name,
    version: '1.0.0',
    release: 'ga',
    categories: [],
    isUnverified: false,
  } as IntegrationCardItem);

const intA = mockCard('A');
const intB = mockCard('B');
const intC = mockCard('C');
const intD = mockCard('D');

describe('_promoteFeaturedIntegrations', () => {
  it('should return list unaltered if no featured integrations for category', () => {
    const list = [intA, intB];
    const selectedCategory = 'security';
    const featuredIntegrationsByCategory = {};
    expect(
      _promoteFeaturedIntegrations(featuredIntegrationsByCategory, list, selectedCategory)
    ).toEqual(list);
  });
  it('should promote single integration to front of list if it matches the selected category', () => {
    const list = [intA, intB];
    const selectedCategory = 'security';
    const featuredIntegrationsByCategory = {
      security: ['B'],
    };
    expect(
      _promoteFeaturedIntegrations(featuredIntegrationsByCategory, list, selectedCategory)
    ).toEqual([intB, intA]);
  });
  it('should promote single integration to front of list if the selected category is empty string', () => {
    const list = [intA, intB];
    const selectedCategory = '';
    const featuredIntegrationsByCategory = {
      '': ['B'],
    };
    expect(
      _promoteFeaturedIntegrations(featuredIntegrationsByCategory, list, selectedCategory)
    ).toEqual([intB, intA]);
  });
  it('should respect the order of the featured integrations list', () => {
    const list = [intA, intB, intC, intD];
    const selectedCategory = 'security';
    const featuredIntegrationsByCategory = {
      security: ['C', 'B'],
    };
    expect(
      _promoteFeaturedIntegrations(featuredIntegrationsByCategory, list, selectedCategory)
    ).toEqual([intC, intB, intA, intD]);
  });
});
