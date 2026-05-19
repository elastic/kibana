import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { type Message } from '../../../common';
import type { FunctionCallChatFunction } from '../../service/types';
export declare const GET_RELEVANT_FIELD_NAMES_SYSTEM_MESSAGE = "You are a helpful assistant for Elastic Observability. \nYour task is to determine which fields are relevant to the conversation by selecting only the field IDs from the provided list. \nThe list in the user message consists of JSON objects that map a human-readable field \"name\" to its unique \"id\". \nYou must not output any field names \u2014 only the corresponding \"id\" values. Ensure that your output follows the exact JSON format specified.";
export declare function getRelevantFieldNames({ index, start, end, dataViews, esClient, savedObjectsClient, chat, messages, signal, logger, }: {
    index: string | string[];
    start?: string;
    end?: string;
    dataViews: DataViewsServerPluginStart;
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract;
    messages: Message[];
    chat: FunctionCallChatFunction;
    signal: AbortSignal;
    logger: Logger;
}): Promise<{
    fields: string[];
    stats: {
        analyzed: number;
        total: number;
    };
}>;
