/**
 * Tool IDs for the Streams memory tools. Defined locally because these are internal tools,
 * inlined via skills — they do not need to be registered or defined in the shared agent-builder-common package.
 */
export declare const platformStreamsMemoryTools: {
    readonly memorySearch: "platform.streams.memory.search";
    readonly memoryRead: "platform.streams.memory.read";
    readonly memoryWrite: "platform.streams.memory.write";
    readonly memoryPatch: "platform.streams.memory.patch";
    readonly memoryList: "platform.streams.memory.list";
    readonly memoryDelete: "platform.streams.memory.delete";
    readonly memoryRecentChanges: "platform.streams.memory.recent_changes";
};
