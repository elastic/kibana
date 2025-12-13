/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { termQuery } from '@kbn/es-query';
import type {
  IStorageClient,
  StorageClientDeleteResponse,
  StorageClientIndexResponse,
} from '@kbn/storage-adapter';
import objectHash from 'object-hash';
import type { LLMSuggestion } from '@kbn/streams-schema/src/llm_suggestion';
import { LLMSuggestionNotFoundError } from '../errors/llm_suggestion_not_found_error';
import {
  STREAM_NAME,
  LLM_SUGGESTION_DESCRIPTION,
  LLM_SUGGESTION_NAME,
  LLM_SUGGESTION_TYPE,
  LLM_SUGGESTION_UUID,
} from './fields';
import type { LLMSuggestionStorageSettings } from './storage_settings';
import type { StoredLLMSuggestion } from './stored_llm_suggestions';

// Local aliases to keep external types but use "Suggestion" naming internally
type Suggestion = LLMSuggestion;
type SuggestionType = string;

interface SuggestionBulkIndexOperation {
  index: { suggestion: Suggestion };
}
interface SuggestionBulkDeleteOperation {
  delete: { suggestion: { type: SuggestionType; name: string } };
}

export type SuggestionBulkOperation = SuggestionBulkIndexOperation | SuggestionBulkDeleteOperation;

export class LLMSuggestionClient {
  constructor(
    private readonly storageClient: IStorageClient<
      LLMSuggestionStorageSettings,
      StoredLLMSuggestion
    >
  ) {}

  fromStorage(stored: StoredLLMSuggestion): LLMSuggestion {
    return {
      type: stored[LLM_SUGGESTION_TYPE],
      name: stored[LLM_SUGGESTION_NAME],
      description: stored[LLM_SUGGESTION_DESCRIPTION],
    };
  }

  toStorage(streamName: string, llmSuggestion: LLMSuggestion): StoredLLMSuggestion {
    return {
      [STREAM_NAME]: streamName,
      [LLM_SUGGESTION_UUID]: this.getLLMSuggestionUuid(streamName, llmSuggestion.name),
      [LLM_SUGGESTION_TYPE]: llmSuggestion.type,
      [LLM_SUGGESTION_NAME]: llmSuggestion.name,
      [LLM_SUGGESTION_DESCRIPTION]: llmSuggestion.description,
    };
  }

  async syncSuggestionList(
    name: string,
    suggestions: Suggestion[]
  ): Promise<{ deleted: Suggestion[]; indexed: Suggestion[] }> {
    const suggestionsResponse = await this.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: [...termQuery(STREAM_NAME, name)],
        },
      },
    });

    const existingSuggestions = suggestionsResponse.hits.hits.map((hit) => {
      return hit._source;
    });

    const nextSuggestions = suggestions.map((suggestion) => {
      return this.toStorage(name, suggestion);
    });

    const nextIds = new Set(nextSuggestions.map((s) => s[LLM_SUGGESTION_UUID]));
    const suggestionsDeleted = existingSuggestions.filter(
      (s) => !nextIds.has(s[LLM_SUGGESTION_UUID])
    );

    const operations: SuggestionBulkOperation[] = [
      ...suggestionsDeleted.map((s) => ({
        delete: { suggestion: this.fromStorage(s), name },
      })),
      ...nextSuggestions.map((s) => ({
        index: { suggestion: this.fromStorage(s), name },
      })),
    ];

    if (operations.length) {
      await this.bulk(name, operations);
    }

    return {
      deleted: suggestionsDeleted.map((s) => this.fromStorage(s)),
      indexed: suggestions,
    };
  }

  async linkSuggestion(name: string, suggestion: Suggestion): Promise<Suggestion> {
    const document = this.toStorage(name, suggestion);

    await this.storageClient.index({
      id: document[LLM_SUGGESTION_UUID],
      document,
    });

    return suggestion;
  }

  async saveLLMSuggestion(
    name: string,
    suggestion: Suggestion
  ): Promise<StorageClientIndexResponse> {
    const document = this.toStorage(name, suggestion);
    const id = this.getLLMSuggestionUuid(name, suggestion.name);

    return await this.storageClient.index({
      id,
      document,
    });
  }

  async unlinkSuggestion(name: string, suggestion: Suggestion): Promise<void> {
    const id = this.getLLMSuggestionUuid(name, suggestion.name);

    const { result } = await this.storageClient.delete({ id });
    if (result === 'not_found') {
      throw new LLMSuggestionNotFoundError(
        `Suggestion ${suggestion.name} not found for stream ${name}`
      );
    }
  }

  async clean() {
    await this.storageClient.clean();
  }

  async bulk(name: string, operations: SuggestionBulkOperation[]) {
    return await this.storageClient.bulk({
      operations: operations.map((operation) => {
        if ('index' in operation) {
          const document = this.toStorage(name, operation.index.suggestion);
          return {
            index: {
              document,
              _id: document[LLM_SUGGESTION_UUID],
            },
          };
        }

        const id = this.getLLMSuggestionUuid(name, operation.delete.suggestion.name);
        return {
          delete: {
            _id: id,
          },
        };
      }),
      throwOnFail: true,
    });
  }

  async getSuggestion(
    name: string,
    suggestion: { type: string; name: string }
  ): Promise<Suggestion> {
    const id = this.getLLMSuggestionUuid(name, suggestion.name);
    const hit = await this.storageClient.get({ id });

    return this.fromStorage(hit._source!);
  }

  async deleteSuggestion(
    name: string,
    suggestion: { type: string; name: string }
  ): Promise<StorageClientDeleteResponse> {
    const id = this.getLLMSuggestionUuid(name, suggestion.name);
    return await this.storageClient.delete({ id });
  }

  async updateSuggestion(
    name: string,
    suggestion: Suggestion
  ): Promise<StorageClientIndexResponse> {
    const id = this.getLLMSuggestionUuid(name, suggestion.name);
    return await this.storageClient.index({
      document: this.toStorage(name, suggestion),
      id,
    });
  }

  async getSuggestions(name: string): Promise<{ hits: Suggestion[]; total: number }> {
    const suggestionsResponse = await this.storageClient.search({
      size: 10_000,
      track_total_hits: true,
      query: {
        bool: {
          filter: [...termQuery(STREAM_NAME, name)],
        },
      },
    });

    return {
      hits: suggestionsResponse.hits.hits.map((hit) => this.fromStorage(hit._source)),
      total: suggestionsResponse.hits.total.value,
    };
  }

  getLLMSuggestionUuid(streamName: string, llmSuggestionName: string): string {
    // override required for bwc
    return objectHash({
      [STREAM_NAME]: streamName,
      [LLM_SUGGESTION_NAME]: llmSuggestionName,
    });
  }
}
