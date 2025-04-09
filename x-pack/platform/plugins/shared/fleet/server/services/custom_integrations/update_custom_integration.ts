/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export async function updateCustomIntegration(esClient: any, id: string, fields: any[]) {
  // const body = {
  //   doc: {
  //     fields,
  //   },
  // };

  // const response = await esClient.update({
  //   index: 'custom_integrations',
  //   id,
  //   body,
  // });
  // console.log('the response is', response);
  // return response;
  return 'updated';
}
