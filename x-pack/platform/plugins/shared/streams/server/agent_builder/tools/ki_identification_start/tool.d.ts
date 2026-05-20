import { z } from '@kbn/zod/v4';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { OnboardingStep } from '@kbn/streams-schema';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import type { GetScopedClients } from '../../../routes/types';
export declare const STREAMS_KI_IDENTIFICATION_START_TOOL_ID = "platform.streams.sig_events.ki_identification_start";
declare const onboardingStartSchema: z.ZodObject<{
    stream_name: z.ZodString;
    steps: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEnum<typeof OnboardingStep>>>>;
    connectors: z.ZodOptional<z.ZodObject<{
        features: z.ZodOptional<z.ZodString>;
        queries: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const createKiIdentificationStartTool: ({ getScopedClients, telemetry, }: {
    getScopedClients: GetScopedClients;
    telemetry: EbtTelemetryClient;
}) => BuiltinSkillBoundedTool<typeof onboardingStartSchema>;
export {};
