import type { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
export type StreamsPrivileges = ReturnType<typeof useStreamsPrivileges>;
export type StreamsFeatures = StreamsPrivileges['features'];
export declare function useStreamsPrivileges(): {
    ui: {
        [STREAMS_UI_PRIVILEGES.manage]: boolean;
        [STREAMS_UI_PRIVILEGES.show]: boolean;
    };
    features: {
        ui: {
            enabled: boolean;
        };
        significantEvents: {
            enabled: boolean;
            available: boolean;
        } | undefined;
        significantEventsDiscovery: {
            enabled: boolean;
            available: boolean;
        } | undefined;
        queryStreams: {
            enabled: boolean;
        };
        contentPacks: {
            enabled: boolean;
        };
        attachments: {
            enabled: boolean;
        };
    };
    isLoading: boolean;
};
