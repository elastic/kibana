import type { ToolCreateParams } from '@kbn/agent-builder-server';
import type { ToolTypeUpdateParams } from '../../tool_provider';
import type { ToolProperties } from './storage';
import type { ToolDocument, ToolPersistedDefinition } from './types';
export declare const fromEs: <TConfig extends object = {}>(document: ToolDocument) => ToolPersistedDefinition<TConfig>;
export declare const createAttributes: ({ createRequest, space, creationDate, }: {
    createRequest: ToolCreateParams;
    space: string;
    creationDate?: Date;
}) => ToolProperties;
export declare const updateDocument: ({ current, update, updateDate, }: {
    current: ToolProperties;
    update: ToolTypeUpdateParams;
    updateDate?: Date;
}) => ToolProperties;
