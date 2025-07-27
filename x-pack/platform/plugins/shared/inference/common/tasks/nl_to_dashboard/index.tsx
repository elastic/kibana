/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const tool = {
  id: '.nl_to_lens',
  name: 'NL to Lens',
  description: 'Use this tool to convert natural language to a Lens dashboard',
  meta: {
    tags: ['foo', 'bar'],
  },
  schema: z.object({
    input: z.string().describe('The natural language input to convert to a Lens dashboard'),
  }),
  handler: async ({ input }, { events, connectorId }) => {},
};

const validateAndCorrect = (output: any) => {
  // @TODO: validate and correct the output
  return output;
};

const toolWithClientCallback = {
  ...tool,
  postActionClientExecution: async (services: { dashboardApi: DashboardApi }, output: any) => {
    const { dashboardApi } = services;
    const json = validateAndCorrect(output);
    const embeddable = await dashboardApi.addNewPanel(json, true);
    return embeddable.toEmbeddableJSON();
  },
};

const toolToObservabilityAdapter = () => {};

const toolToSecurityAdapter = () => {};
