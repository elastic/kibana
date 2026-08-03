import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import type { RelayBindingsPage, RelayCallbackResponse, RelayClaimResponse, RelayClientContract, RelayInstallRequest, RelayInstallResponse, RelayListBindingsOptions } from './types';
export interface RelayClientOptions {
    baseUrl: string;
    configurationUtilities: ActionsConfigurationUtilities;
    logger: Logger;
}
export declare class RelayClient implements RelayClientContract {
    private readonly axios;
    private readonly baseUrl;
    private readonly configurationUtilities;
    private readonly logger;
    constructor({ baseUrl, configurationUtilities, logger }: RelayClientOptions);
    startInstall(body: RelayInstallRequest): Promise<RelayInstallResponse>;
    fetchClaim(claimId: string): Promise<RelayClaimResponse>;
    /** Unbind a single workspace binding identified by its tenant key. */
    unbind(tenantKey: string): Promise<void>;
    /**
     * Fetch a single page of the calling deployment's own SUB (channel-scoped) bindings for a
     * given Slack workspace tenant — the "connected channels" inventory. Each entry carries its
     * persisted display snapshot (`display_name`, `visibility`). Returns the page's items plus
     * the Relay's opaque `next_cursor` (as `nextCursor`); pass it back via `options.cursor` to
     * read the next page.
     */
    listBindings(tenantKey: string, options?: RelayListBindingsOptions): Promise<RelayBindingsPage>;
    /** Claim an unclaimed channel (put-if-absent). The caller must hold a registration for the tenant. */
    bind(tenantKey: string, channelId: string): Promise<void>;
    /** Release a channel binding owned by this deployment. */
    unbindChannel(tenantKey: string, channelId: string): Promise<void>;
    isRelayOrigin(url: string): boolean;
    postCallback(url: string, body: unknown, signal: AbortSignal): Promise<RelayCallbackResponse>;
    private post;
    private put;
    private del;
    private get;
    private send;
    private sendRequest;
}
