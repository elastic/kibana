/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaClient } from '@kbn/kibana-api-cli';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { StreamlangProcessorDefinition } from '@kbn/streamlang';
import type { ProcessingService } from '@kbn/streams-ai';
import type { SimulationResponse } from '@kbn/streams-schema';
import type { FlattenRecord } from '@kbn/streams-schema';
import { flattenObjectNestedLast } from '@kbn/object-utils';

export class HttpProcessingService implements ProcessingService {
  constructor(private readonly kibanaClient: KibanaClient, private readonly signal: AbortSignal) {}

  public async simulate(
    streamName: string,
    {
      samples,
      processor,
    }: {
      samples: SearchHit[];
      processor: StreamlangProcessorDefinition;
    }
  ): Promise<SimulationResponse> {
    const processorId = (processor as { id?: string }).id ?? 'processor';

    if (!samples.length) {
      return this.createEmptyResponse(processorId);
    }

    const documents: FlattenRecord[] = samples.map((sample) => {
      const source = (sample._source ?? {}) as Record<string, unknown>;
      return flattenObjectNestedLast(source) as FlattenRecord;
    });

    const response = await this.kibanaClient.fetch<SimulationResponse>(
      `/internal/streams/${encodeURIComponent(streamName)}/processing/_simulate`,
      {
        method: 'POST',
        body: {
          processing: {
            steps: [processor],
          },
          documents,
        },
        headers: {
          'content-type': 'application/json',
        },
        signal: this.signal,
      }
    );

    return response;
  }

  private createEmptyResponse(processorId: string) {
    return {
      detected_fields: [],
      documents: [],
      processors_metrics: {
        [processorId]: {
          detected_fields: [],
          errors: [],
          failed_rate: 0,
          skipped_rate: 0,
          parsed_rate: 1,
        },
      },
      documents_metrics: {
        failed_rate: 0,
        partially_parsed_rate: 0,
        skipped_rate: 0,
        parsed_rate: 1,
      },
    } satisfies SimulationResponse;
  }
}
