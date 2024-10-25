/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message, MessageRole } from '@kbn/inference-plugin/common';
import { InferenceClient, withoutOutputUpdateEvents } from '@kbn/inference-plugin/server';
import { findLastIndex } from 'lodash';
import { lastValueFrom } from 'rxjs';
import { RCA_SYSTEM_PROMPT_BASE } from './system_prompt_base';

export async function writeKeywordSearch({
  connectorId,
  inferenceClient,
  context,
  messages,
}: {
  connectorId: string;
  inferenceClient: InferenceClient;
  context: string;
  messages: Message[];
}): Promise<{
  values: Array<{
    fragments: string[];
    relationship: string;
  }>;
}> {
  const indexOfLastUserMessage = findLastIndex(
    messages,
    (message) => message.role === MessageRole.User
  );

  const untilLastUserMessage = messages.slice(0, indexOfLastUserMessage + 1);

  const outputCompleteEvent$ = await lastValueFrom(
    inferenceClient
      .output('extract_keyword_searches', {
        connectorId,
        previousMessages: untilLastUserMessage,
        system: `${RCA_SYSTEM_PROMPT_BASE}`,
        input: `Your current task is to to extract keyword searches
    to find related entities, based on the previous conversation.

    ## Context

    ${context}

    # Guide: Constructing Keyword Searches to Find Related Entities

    When investigating issues like elevated failure rates for a
    specific endpoint, you can use the metadata at hand (IP addresses,
    URLs, session IDs, tracing IDs, etc.) to build targeted keyword searches.
    By extracting meaningful fragments from the data, you can correlate
    related services or hosts across distributed systems. Here’s how
    you can break down the metadata and format your searches.

    ---

    ## Key Metadata and Search Format

    ### Example: Investigating a service failure for \`/api/products\`

    You can break down various pieces of metadata into searchable
    fragments. For each value, include a short description of its
    relationship to the investigation. This value will be used
    by the system to determine the relevance of a given entity
    that matches the search request.

    ### 1. **IP Address and Port**
    - **Fragments:**
      - \`"10.44.0.11:8080"\`: Full address.
      - \`"10.44.0.11"\`: IP address only.
      - \`"8080"\`: Port number.
    - **Relationship:** Describes the IP and port of the investigated service
    (\`myservice\`).

    ### 2. **Outgoing Request URL**
    - **Fragments:**
      - \`"http://called-service/api/product"\`: Full outgoing URL.
      - \`"/api/product"\`: Endpoint path.
      - \`"called-service"\`: Service name of the upstream dependency.
      - **Relationship:** Identifies an outgoing request from \`myservice\`
      to an upstream service.

    ### 3. **Parent and Span IDs**
      - **Fragments:**
        - \`"000aa"\`: Parent ID.
        - \`"000bbb"\`: Span ID.
      - **Relationship:** Tracing IDs linking \`myservice\` with downstream
      services making calls.

    ---

    ## Example Search Format in JSON

    To structure your keyword search, format the fragments and their
    relationships in a JSON array like this:

    \`\`\`json
    {
      "values": [
        {
          "fragments": [
            "10.44.0.11:8080",
            "10.44.0.11",
            "8080"
          ],
          "relationship": "This describes the IP address and port that the investigated service (myservice) is running on."
        },
        {
          "fragments": [
            "http://called-service/api/cart",
            "/api/cart",
            "called-service"
          ],
          "relationship": "These URL fragments, found in the data for the investigated service (myservice), were part of outgoing connections to an upstream service."
        },
        {
          "fragments": [
            "000aa",
            "000bbb"
          ],
          "relationship": "These describe parent and span IDs found on the investigated service (myservice). They could be referring to spans found on the downstream service that called out to myservice."
        }
      ]
    }`,
        schema: {
          type: 'object',
          properties: {
            values: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  fragments: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                  },
                  relationship: {
                    type: 'string',
                  },
                },
                required: ['fragments', 'relationship'],
              },
            },
          },
          required: ['values'],
        } as const,
      })
      .pipe(withoutOutputUpdateEvents())
  );

  return outputCompleteEvent$.output;
}
