import { z } from '@kbn/zod/v4';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { GetScopedClients } from '../../../routes/types';
export declare const STREAMS_KI_IDENTIFICATION_STATUS_TOOL_ID = "platform.streams.sig_events.ki_identification_status";
declare const onboardingStatusSchema: z.ZodObject<{
    stream_name: z.ZodString;
}, z.core.$strip>;
export declare const createKiIdentificationStatusTool: ({ getScopedClients, }: {
    getScopedClients: GetScopedClients;
}) => BuiltinSkillBoundedTool<typeof onboardingStatusSchema>;
export {};
