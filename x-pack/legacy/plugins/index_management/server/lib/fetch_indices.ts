/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IndexDataEnricher } from '../services';
import { Index, CallAsCurrentUser } from '../types';
import { fetchAliases } from './fetch_aliases';

interface Hit {
  health: string;
  status: string;
  index: string;
  uuid: string;
  pri: string;
  rep: string;
  'docs.count': any;
  'store.size': any;
  sth: 'true' | 'false';
}

interface Aliases {
  [key: string]: string[];
}

interface Params {
  format: string;
  h: string;
  index?: string[];
}

function formatHits(hits: Hit[], aliases: Aliases): Index[] {
  return hits.map((hit: Hit) => {
    return {
      health: hit.health,
      status: hit.status,
      name: hit.index,
      uuid: hit.uuid,
      primary: hit.pri,
      replica: hit.rep,
      documents: hit['docs.count'],
      size: hit['store.size'],
      isFrozen: hit.sth === 'true', // sth value coming back as a string from ES
      aliases: aliases.hasOwnProperty(hit.index) ? aliases[hit.index] : 'none',
    };
  });
}

async function fetchIndicesCall(callAsCurrentUser: CallAsCurrentUser, indexNames?: string[]) {
  const params: Params = {
    format: 'json',
    h: 'health,status,index,uuid,pri,rep,docs.count,sth,store.size',
  };

  if (indexNames) {
    params.index = indexNames;
  }

  return await callAsCurrentUser('cat.indices', params);
}

export const fetchIndices = async (
  callAsCurrentUser: CallAsCurrentUser,
  indexDataEnricher: IndexDataEnricher,
  indexNames?: string[]
) => {
  const aliases = await fetchAliases(callAsCurrentUser);
  const hits = await fetchIndicesCall(callAsCurrentUser, indexNames);
  const indices = formatHits(hits, aliases);

  return await indexDataEnricher.enrichIndices(indices, callAsCurrentUser);
};
