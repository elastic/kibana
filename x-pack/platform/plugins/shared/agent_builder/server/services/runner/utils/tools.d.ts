import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolProvider, Runner, ToolRegistry } from '@kbn/agent-builder-server';
export declare const createToolProvider: ({ registry, runner, request, }: {
    registry: ToolRegistry;
    runner: Runner;
    request: KibanaRequest;
}) => ToolProvider;
