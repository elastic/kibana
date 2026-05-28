import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
/**
 * When running locally, only UUIDs are allowed for non-preconfigured connectors.
 * We generate a deterministic UUID from the logical connector id so runs are stable/idempotent.
 */
export declare function getConnectorIdAsUuid(connectorId: string): string;
/**
 * Returns the connector id to use at runtime.
 * When `KBN_EVALS_SKIP_CONNECTOR_SETUP` is set, the original id is returned as-is
 * (preconfigured connectors don't need UUID mapping).
 * Otherwise, a deterministic UUID is generated.
 */
export declare function resolveConnectorId(connectorId: string): string;
export declare function deleteConnectorById({ fetch, connectorId, log, }: {
    fetch: HttpHandler;
    connectorId: string;
    log: ToolingLog;
}): Promise<void>;
export declare function createConnectorFixture({ predefinedConnector, fetch, log, use, }: {
    predefinedConnector: AvailableConnectorWithId;
    fetch: HttpHandler;
    log: ToolingLog;
    use: (connector: AvailableConnectorWithId) => Promise<void>;
}): Promise<void>;
