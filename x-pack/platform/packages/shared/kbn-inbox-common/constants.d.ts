export declare const INBOX_FEATURE_ID: "inbox";
export declare const INBOX_PLUGIN_NAME: "Inbox";
export declare const INBOX_INTERNAL_URL: "/internal/inbox";
export declare const INBOX_ACTIONS_URL: "/internal/inbox/actions";
/**
 * Parameterized template for the respond-to-action route. Use
 * `buildRespondToActionUrl(sourceApp, sourceId)` to construct a concrete URL.
 */
export declare const INBOX_ACTION_RESPOND_URL_TEMPLATE: "/internal/inbox/actions/{source_app}/{source_id}/respond";
export declare const buildRespondToActionUrl: (sourceApp: string, sourceId: string) => string;
/**
 * Surfaces through which a response can be submitted. Aligns with the HITL
 * GA epic's channel tracking ([security-team#16709](https://github.com/elastic/security-team/issues/16709)
 * and the channel extensibility plan [security-team#16712](https://github.com/elastic/security-team/issues/16712)).
 */
export declare const INBOX_CHANNELS: {
    readonly inbox: "inbox";
    readonly kibanaExecutionView: "kibana_execution_view";
    readonly agentBuilder: "agent_builder";
    readonly slack: "slack";
    readonly api: "api";
};
export type InboxChannel = (typeof INBOX_CHANNELS)[keyof typeof INBOX_CHANNELS];
export declare const INBOX_RESPONSE_MODES: readonly ["pending", "responded", "timed_out"];
export type InboxResponseMode = (typeof INBOX_RESPONSE_MODES)[number];
export declare const API_VERSIONS: {
    readonly internal: {
        readonly v1: "1";
    };
};
export declare const INTERNAL_API_ACCESS: "internal";
export declare const INBOX_ACTION_STATUSES: readonly ["pending", "approved", "rejected"];
export type InboxActionStatus = (typeof INBOX_ACTION_STATUSES)[number];
export declare const MAX_INBOX_ACTIONS_PER_PAGE = 100;
export declare const DEFAULT_INBOX_ACTIONS_PER_PAGE = 25;
