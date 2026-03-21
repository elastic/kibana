import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolProviderFn, ReadonlyToolProvider } from '../tool_provider';
import type { BuiltinToolRegistry } from './builtin_registry';
import type { AnyToolTypeDefinition } from '../tool_types/definitions';
export declare const createBuiltinProviderFn: ({ registry, toolTypes, }: {
    registry: BuiltinToolRegistry;
    toolTypes: AnyToolTypeDefinition[];
}) => ToolProviderFn<true>;
export declare const createBuiltinToolProvider: ({ registry, toolTypes, request, space, }: {
    registry: BuiltinToolRegistry;
    toolTypes: AnyToolTypeDefinition[];
    request: KibanaRequest;
    space: string;
}) => ReadonlyToolProvider;
