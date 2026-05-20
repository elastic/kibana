import type { z } from '@kbn/zod/v4';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { GetScopedClients } from '../../../routes/types';
export declare const STREAMS_KI_IDENTIFICATION_CANCEL_TOOL_ID = "platform.streams.sig_events.ki_identification_cancel";
declare const cancelSchema: z.ZodObject<{
    stream_name: z.ZodString;
}, z.core.$strip>;
export declare const createKiIdentificationCancelTool: ({ getScopedClients, }: {
    getScopedClients: GetScopedClients;
}) => BuiltinSkillBoundedTool<typeof cancelSchema>;
export {};
