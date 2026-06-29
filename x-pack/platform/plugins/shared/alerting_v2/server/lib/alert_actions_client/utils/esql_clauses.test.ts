/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { buildEpisodeDotIdInClause, buildEpisodeIdsInClause } from './esql_clauses';

const render = (clause: ReturnType<typeof buildEpisodeIdsInClause>): string =>
  esql`FROM stream | WHERE (${clause})`.toRequest().query;

describe('buildEpisodeIdsInClause', () => {
  it('renders the inert `FALSE` seed when no episode_ids are provided', () => {
    // The empty case has to short-circuit to FALSE so the surrounding
    // `(... AND ${clause})` filter matches no rows instead of every row.
    // (`esql` collapses redundant outer parens, so we don't assert on them.)
    const rendered = render(buildEpisodeIdsInClause([]));

    expect(rendered).toMatch(/WHERE\s+FALSE/);
    expect(rendered).not.toContain('episode_id ==');
  });

  it('chains a single episode_id onto the FALSE seed via OR', () => {
    const rendered = render(buildEpisodeIdsInClause(['ep-1']));

    expect(rendered).toContain('FALSE OR episode_id == "ep-1"');
  });

  it('chains multiple episode_ids in input order', () => {
    const rendered = render(buildEpisodeIdsInClause(['ep-1', 'ep-2', 'ep-3']));

    expect(rendered).toContain(
      'FALSE OR episode_id == "ep-1" OR episode_id == "ep-2" OR episode_id == "ep-3"'
    );
  });
});

describe('buildEpisodeDotIdInClause', () => {
  it('renders the inert `FALSE` seed when no episode_ids are provided', () => {
    const rendered = render(buildEpisodeDotIdInClause([]));

    expect(rendered).toMatch(/WHERE\s+FALSE/);
    expect(rendered).not.toContain('episode.id ==');
  });

  it('chains a single episode_id onto the FALSE seed via OR', () => {
    const rendered = render(buildEpisodeDotIdInClause(['ep-1']));

    expect(rendered).toContain('FALSE OR episode.id == "ep-1"');
  });

  it('chains multiple episode_ids in input order', () => {
    const rendered = render(buildEpisodeDotIdInClause(['ep-1', 'ep-2', 'ep-3']));

    expect(rendered).toContain(
      'FALSE OR episode.id == "ep-1" OR episode.id == "ep-2" OR episode.id == "ep-3"'
    );
  });
});
