/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toElasticsearchQuery } from '@kbn/es-query';
import { buildOwnedByFilter, isScheduledReportOwner } from './ownership';

describe('isScheduledReportOwner', () => {
  it('matches when the stored id equals the current user id', () => {
    expect(
      isScheduledReportOwner({
        report: {
          createdBy: 'rshared',
          createdById: 'realm:["native","default_native","rshared"]',
        },
        currentUser: { id: 'realm:["native","default_native","rshared"]', username: 'rshared' },
      })
    ).toBe(true);
  });

  it('does not match when the stored id differs, even for the same username (cross-realm collision)', () => {
    expect(
      isScheduledReportOwner({
        report: { createdBy: 'rshared', createdById: 'realm:["file","default_file","rshared"]' },
        currentUser: { id: 'realm:["native","default_native","rshared"]', username: 'rshared' },
      })
    ).toBe(false);
  });

  it('does not fall back to username matching once a document has a stored id', () => {
    expect(
      isScheduledReportOwner({
        report: { createdBy: 'rshared', createdById: 'realm:["file","default_file","rshared"]' },
        currentUser: { id: undefined, username: 'rshared' },
      })
    ).toBe(false);
  });

  it('falls back to username matching for legacy documents with no stored id', () => {
    expect(
      isScheduledReportOwner({
        report: { createdBy: 'rshared', createdById: undefined },
        currentUser: { id: 'realm:["native","default_native","rshared"]', username: 'rshared' },
      })
    ).toBe(true);
  });

  it('denies a legacy document when usernames differ', () => {
    expect(
      isScheduledReportOwner({
        report: { createdBy: 'someone-else', createdById: undefined },
        currentUser: { id: undefined, username: 'rshared' },
      })
    ).toBe(false);
  });

  it('denies when neither an id nor a username is available', () => {
    expect(
      isScheduledReportOwner({
        report: { createdBy: 'rshared', createdById: undefined },
        currentUser: {},
      })
    ).toBe(false);
  });
});

describe('buildOwnedByFilter', () => {
  it('builds only the legacy clause when the current user has no stable id', () => {
    const node = buildOwnedByFilter({ id: undefined, username: 'somebody' });
    expect(node).toMatchObject({ type: 'function', function: 'and' });
  });

  it('builds an OR of the id clause and the legacy clause when the current user has a stable id', () => {
    const node = buildOwnedByFilter({ id: 'profile-123', username: 'somebody' });
    expect(node).toMatchObject({ type: 'function', function: 'or' });
  });

  it('returns undefined when the identity has neither an id nor a username', () => {
    expect(buildOwnedByFilter({})).toBeUndefined();
  });

  it('builds only the id clause when the current user has no username', () => {
    const node = buildOwnedByFilter({ id: 'profile-123', username: undefined });
    expect(node).toMatchObject({ type: 'function', function: 'is' });
  });

  it('excludes documents with a stored createdById via a wildcard-`is`-under-`not`, not a bare exists node', () => {
    const node = buildOwnedByFilter({ id: undefined, username: 'somebody' });
    // arguments[1] is the "createdById does not exist" clause of the `and`.
    const notClause = (node as unknown as { arguments: unknown[] }).arguments[1] as {
      type: string;
      function: string;
      arguments: unknown[];
    };
    expect(notClause).toMatchObject({ type: 'function', function: 'not' });
    expect(notClause.arguments[0]).toMatchObject({ type: 'function', function: 'is' });
  });

  it('matches a username containing KQL special characters exactly rather than parsing them as syntax', () => {
    const weirdUsername = 'weird"user*[name]';
    const node = buildOwnedByFilter({ id: undefined, username: weirdUsername });
    const createdByClause = (node as unknown as { arguments: unknown[] }).arguments[0];

    expect(toElasticsearchQuery(createdByClause as never)).toEqual({
      bool: {
        should: [{ match: { 'scheduled_report.attributes.createdBy': weirdUsername } }],
        minimum_should_match: 1,
      },
    });
  });

  it('matches a realm-qualified id containing quotes and brackets exactly', () => {
    const id = 'realm:["file","default_file","rshared"]';
    const node = buildOwnedByFilter({ id, username: 'rshared' });
    const idClause = (node as unknown as { arguments: unknown[] }).arguments[0];

    expect(toElasticsearchQuery(idClause as never)).toEqual({
      bool: {
        should: [{ match: { 'scheduled_report.attributes.createdById': id } }],
        minimum_should_match: 1,
      },
    });
  });
});
