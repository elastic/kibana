/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useLocalSearch } from './use_local_search';

type SearchablePackage = Parameters<typeof useLocalSearch>[0][number];

const makePackage = (
  overrides: Partial<SearchablePackage> & { id: string }
): SearchablePackage => ({
  name: overrides.id,
  title: overrides.id,
  description: '',
  ...overrides,
});

const nginx = makePackage({
  id: 'nginx',
  title: 'Nginx',
  description: 'Collect logs and metrics from Nginx web servers.',
});
const nginxOtel = makePackage({ id: 'nginx-otel', title: 'Nginx' });
const awsBedrock = makePackage({
  id: 'aws_bedrock',
  title: 'Amazon Bedrock',
  description: 'Collect Bedrock model invocation logs.',
});
const kafka = makePackage({
  id: 'kafka',
  title: 'Kafka',
  description: "Monitor the cluster's brokers.",
  searchableContent: 'Confluent event bus',
});
const allPackages = [nginx, nginxOtel, awsBedrock, kafka];

const searchIds = (packageList: SearchablePackage[], query: string): string[] => {
  const { result } = renderHook(() => useLocalSearch(packageList, false));
  return (result.current?.search(query) ?? []).map(({ id }) => id).sort();
};

describe('useLocalSearch', () => {
  it('returns null while the package list is loading', () => {
    const { result } = renderHook(() => useLocalSearch(allPackages, true));

    expect(result.current).toBeNull();
  });

  it('matches the start of a word, ignoring case, but not the middle', () => {
    expect(searchIds(allPackages, 'ngi')).toEqual(['nginx', 'nginx-otel']);
    expect(searchIds(allPackages, 'NGI')).toEqual(['nginx', 'nginx-otel']);
    expect(searchIds(allPackages, 'ginx')).toEqual([]);
  });

  it('requires every query word to match, in any of the searched fields', () => {
    expect(searchIds(allPackages, 'nginx web')).toEqual(['nginx']);
    expect(searchIds(allPackages, 'kafka confluent')).toEqual(['kafka']);
    expect(searchIds(allPackages, 'nginx kafka')).toEqual([]);
  });

  it('keeps hyphens and apostrophes inside a word and splits on underscores', () => {
    expect(searchIds(allPackages, 'nginx-otel')).toEqual(['nginx-otel']);
    expect(searchIds(allPackages, 'otel')).toEqual([]);
    expect(searchIds(allPackages, "cluster's")).toEqual(['kafka']);
    expect(searchIds([kafka], 's')).toEqual([]);
    expect(searchIds([makePackage({ id: 'aws_bedrock', title: 'Amazon' })], 'bedrock')).toEqual([
      'aws_bedrock',
    ]);
  });

  it('returns nothing for queries without any words', () => {
    for (const query of ['', '   ', '(', '"', '++']) {
      expect(searchIds(allPackages, query)).toEqual([]);
    }
  });

  it('treats words that are also object property names as plain words', () => {
    const builder = makePackage({ id: 'builder', description: 'Uses the constructor pattern.' });

    expect(searchIds(allPackages, 'constructor')).toEqual([]);
    expect(searchIds([...allPackages, builder], 'constructor')).toEqual(['builder']);
  });

  it('searches the new list after the package list changes', () => {
    const { result, rerender } = renderHook(
      ({ packageList }) => useLocalSearch(packageList, false),
      { initialProps: { packageList: [nginx] } }
    );
    expect(result.current?.search('kafka')).toEqual([]);

    rerender({ packageList: [nginx, kafka] });

    expect(result.current?.search('kafka')).toEqual([kafka]);
  });
});
