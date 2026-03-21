import type { KibanaRequest } from '@kbn/core-http-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { ModelProvider } from '@kbn/agent-builder-server/runner';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { TrackingService } from '../../telemetry';
export interface CreateModelProviderOpts {
    inference: InferenceServerStart;
    request: KibanaRequest;
    defaultConnectorId?: string;
    trackingService?: TrackingService;
    uiSettings: UiSettingsServiceStart;
    savedObjects: SavedObjectsServiceStart;
}
export type CreateModelProviderFactoryFn = (opts: Omit<CreateModelProviderOpts, 'request' | 'defaultConnectorId'>) => ModelProviderFactoryFn;
export type ModelProviderFactoryFn = (opts: Pick<CreateModelProviderOpts, 'request' | 'defaultConnectorId'>) => ModelProvider;
/**
 * Utility function to creates a {@link ModelProviderFactoryFn}
 */
export declare const createModelProviderFactory: CreateModelProviderFactoryFn;
/**
 * Utility function to create a {@link ModelProvider}
 */
export declare const createModelProvider: ({ inference, request, defaultConnectorId, trackingService, uiSettings, savedObjects, }: CreateModelProviderOpts) => ModelProvider;
