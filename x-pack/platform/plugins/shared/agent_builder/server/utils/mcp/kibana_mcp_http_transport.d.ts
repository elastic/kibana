import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { MessageExtraInfo, JSONRPCMessage, RequestId } from '@modelcontextprotocol/sdk/types.js';
import type { KibanaResponseFactory, KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { IKibanaResponse } from '@kbn/core/server';
/**
 * Server transport for Streamable HTTP: this implements the MCP Streamable HTTP transport specification.
 * It supports direct HTTP responses. It doesn't support SSE streaming.
 *
 * It is compatible with Kibana's HTTP request/response abstractions. Implementation is adapted from:
 * https://github.com/modelcontextprotocol/typescript-sdk/blob/main/src/server/streamableHttp.ts
 *
 * In stateful mode:
 * - Session ID is generated and included in response headers
 * - Session ID is always included in initialization responses
 * - Requests with invalid session IDs are rejected with 404 Not Found
 * - Non-initialization requests without a session ID are rejected with 400 Bad Request
 * - State is maintained in-memory (connections, message history)
 *
 * In stateless mode:
 * - No Session ID is included in any responses
 * - No session validation is performed
 */
export declare class KibanaMcpHttpTransport implements Transport {
    private sessionIdGenerator;
    private _started;
    private _streamMapping;
    private _requestToStreamMapping;
    private _requestResponseMap;
    private _initialized;
    private _logger;
    private _responseCallbacks;
    sessionId?: string;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
    constructor(options: {
        sessionIdGenerator?: () => string;
        logger: Logger;
    });
    /**
     * Registers a callback for when a response is ready for a specific stream
     */
    private registerResponseCallback;
    /**
     * Handles an incoming HTTP request, whether GET or POST
     */
    handleRequest(req: KibanaRequest, res: KibanaResponseFactory): Promise<IKibanaResponse>;
    /**
     * Starts the transport. This is required by the Transport interface but is a no-op
     * for the Streamable HTTP transport as connections are managed per-request.
     */
    start(): Promise<void>;
    /**
     * Closes the transport and cleans up resources
     */
    close(): Promise<void>;
    /**
     * Handles POST requests containing JSON-RPC messages compatible with MCP specification
     */
    handlePostRequest(request: KibanaRequest<unknown, unknown, unknown>, responseFactory: KibanaResponseFactory): Promise<IKibanaResponse>;
    /**
     * Sends a JSON-RPC message
     */
    send(message: JSONRPCMessage, options?: {
        relatedRequestId?: RequestId;
    }): Promise<void>;
    /**
     * Handles unsupported requests (GET, DELETE, PUT, PATCH, etc.)
     */
    private handleUnsupportedRequest;
    private getProtocolVersion;
    private validateProtocolVersion;
    private generateProtocolVersionErrorResponse;
}
