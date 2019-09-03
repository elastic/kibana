/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const indexLifecycleDataEnricher = async (indicesList, callWithRequest) => {
  if (!indicesList || !indicesList.length) {
    return;
  }
  const params = {
    path: '/*/_ilm/explain',
    method: 'GET',
  };
  const { indices: ilmIndicesData } = await callWithRequest('transport.request', params);
  return indicesList.map(index => {
    return {
      ...index,
      ilm: { ...(ilmIndicesData[index.name] || {}) },
    };
  });
};
