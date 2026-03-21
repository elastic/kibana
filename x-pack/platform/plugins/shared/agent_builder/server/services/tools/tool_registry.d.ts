import type { KibanaRequest } from '@kbn/core-http-server';
import { type ToolType } from '@kbn/agent-builder-common';
import type { Runner, ToolRegistry } from '@kbn/agent-builder-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { WritableToolProvider, ReadonlyToolProvider } from './tool_provider';
import type { ToolHealthClient } from './health';
interface CreateToolRegistryParams {
    getRunner: () => Runner;
    persistedProvider: WritableToolProvider;
    builtinProvider: ReadonlyToolProvider;
    request: KibanaRequest;
    space: string;
    uiSettings: UiSettingsServiceStart;
    savedObjects: SavedObjectsServiceStart;
    healthClient: ToolHealthClient;
    healthTrackedToolTypes: Set<ToolType>;
}
export declare const createToolRegistry: (params: CreateToolRegistryParams) => ToolRegistry;
export {};
