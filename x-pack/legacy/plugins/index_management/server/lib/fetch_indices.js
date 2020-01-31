/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fetchAliases } from './fetch_aliases';
import { getIndexManagementDataEnrichers } from '../../index_management_data';

const enrichResponse = async (response, callWithRequest) => {
  let enrichedResponse = response;
  const dataEnrichers = getIndexManagementDataEnrichers();
  for (let i = 0; i < dataEnrichers.length; i++) {
    const dataEnricher = dataEnrichers[i];
    try {
      const dataEnricherResponse = await dataEnricher(enrichedResponse, callWithRequest);
      enrichedResponse = dataEnricherResponse;
    } catch (e) {
      // silently swallow enricher response errors
    }
  }
  return enrichedResponse;
};
function formatHits(hits, aliases) {
  return hits.map(hit => {
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

async function fetchIndicesCall(callWithRequest, indexNames) {
  const params = {
    format: 'json',
    h: 'health,status,index,uuid,pri,rep,docs.count,sth,store.size',
  };
  if (indexNames) {
    params.index = indexNames;
  }

  return await callWithRequest('cat.indices', params);
}

export const fetchIndices = async (callWithRequest, indexNames) => {
  const aliases = await fetchAliases(callWithRequest);
  const hits = await fetchIndicesCall(callWithRequest, indexNames);
  let response = formatHits(hits, aliases);
  response = await enrichResponse(response, callWithRequest);
  return response;
};
