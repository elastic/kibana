/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Readable } from 'stream';
import { EventStreamMarshaller } from '@smithy/eventstream-serde-node';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';
import { identity } from 'lodash';
import { finished } from 'stream/promises';

export const getTokensFromBedrockConverseStream = async function (
  responseStream: Readable,
  logger: Logger
): Promise<{ total_tokens: number; prompt_tokens: number; completion_tokens: number } | null> {
  try {
    const marshaller = new EventStreamMarshaller({
      utf8Encoder: toUtf8,
      utf8Decoder: fromUtf8,
    });
    const responseBuffer: unknown[] = [];
    for await (const chunk of marshaller.deserialize(responseStream, identity)) {
      if (chunk) {
        responseBuffer.push(chunk);
      }
    }
    try {
      await finished(responseStream);
    } catch (e) {
      logger.error('An error occurred while calculating streaming response tokens');
    }
    const usage = responseBuffer[responseBuffer.length - 1] as { metadata: { body: string } };

    if (usage) {
      const parsedResponse = JSON.parse(toUtf8(usage.metadata.body)) as {
        usage: { inputTokens: number; outputTokens: number; totalTokens: number };
      };
      return {
        total_tokens: parsedResponse.usage.totalTokens,
        prompt_tokens: parsedResponse.usage.inputTokens,
        completion_tokens: parsedResponse.usage.outputTokens,
      };
    }
    return null; // Return the final tokens once the generator finishes
  } catch (e) {
    logger.error('Response from Bedrock converse API did not contain usage object');
    return null;
  }
};
