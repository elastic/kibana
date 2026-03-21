import type { KibanaRequest } from '@kbn/core-http-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
export declare const resolveSelectedConnectorId: ({ uiSettings, savedObjects, request, connectorId, inference, }: {
    uiSettings: UiSettingsServiceStart;
    savedObjects: SavedObjectsServiceStart;
    request: KibanaRequest;
    connectorId?: string;
    inference: InferenceServerStart;
}) => Promise<string | undefined>;
