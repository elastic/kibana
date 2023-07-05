/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyzeMarkdown } from './helpers';

const tilde = '`';
const codeDelimiter = '```';

const markDownWithDSLQuery = `
Certainly! Here's an example of a Query DSL (Domain-Specific Language) query using the Elasticsearch Query DSL syntax:

${codeDelimiter}
POST /<index>/_search
{
  \"query\": {
    \"bool\": {
      \"must\": [
        {
          \"match\": {
            \"event.category\": \"security\"
          }
        },
        {
          \"match\": {
            \"message\": \"keyword\"
          }
        }
      ]
    }
  }
}
${codeDelimiter}

In this example, you need to replace ${tilde}<index>${tilde} with the actual name of the index where your security-related data is stored.

The query is structured using the JSON format. It uses the ${tilde}bool${tilde} query to combine multiple conditions using the ${tilde}must${tilde} clause. In this case, we are using the ${tilde}match${tilde} query to search for documents where the ${tilde}event.category${tilde} field matches \"security\" and the ${tilde}message${tilde} field matches \"keyword\". You can modify these values to match your specific search criteria.

By sending this query to the appropriate endpoint, you can retrieve search results that match the specified conditions. The response will include the relevant documents that meet the search criteria.

Remember to refer to the Elastic documentation for more information on the available DQL syntax and query options to further customize and refine your searches based on your specific needs.
`;

const markDownWithKQLQuery = `Certainly! Here's a KQL query based on the ${tilde}user.name${tilde} field:

${codeDelimiter}
user.name: \"9dcc9960-78cf-4ef6-9a2e-dbd5816daa60\"
${codeDelimiter}

This query will filter the events based on the condition that the ${tilde}user.name${tilde} field should exactly match the value \"9dcc9960-78cf-4ef6-9a2e-dbd5816daa60\".`;

describe('analyzeMarkdown', () => {
  it('should identify dsl Query successfully.', () => {
    const result = analyzeMarkdown(markDownWithDSLQuery);
    expect(result[0].type).toBe('dsl');
  });
  it('should identify kql Query successfully.', () => {
    const result = analyzeMarkdown(markDownWithKQLQuery);
    expect(result[0].type).toBe('kql');
  });
});
