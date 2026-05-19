export declare const agentIdRegexp: RegExp;
export declare const agentIdMaxLength = 64;
export declare const validateAgentId: ({ agentId, builtIn, }: {
    agentId: string;
    builtIn: boolean;
}) => string | undefined;
