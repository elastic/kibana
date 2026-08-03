import { z } from '@kbn/zod/v4';
export declare const ChangePointChartAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"aiops.change_point_chart">;
    owner: z.ZodString;
    data: z.ZodObject<{
        state: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>;
}, z.core.$strict>;
export declare const LogRateAnalysisAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"aiops.log_rate_analysis">;
    owner: z.ZodString;
    data: z.ZodObject<{
        state: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>;
}, z.core.$strict>;
export declare const PatternAnalysisAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"aiops.pattern_analysis">;
    owner: z.ZodString;
    data: z.ZodObject<{
        state: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>;
}, z.core.$strict>;
type ChangePointChartAttachmentPayload = z.infer<typeof ChangePointChartAttachmentPayloadSchema>;
type LogRateAnalysisAttachmentPayload = z.infer<typeof LogRateAnalysisAttachmentPayloadSchema>;
type PatternAnalysisAttachmentPayload = z.infer<typeof PatternAnalysisAttachmentPayloadSchema>;
export type ChangePointChartAttachmentData = ChangePointChartAttachmentPayload['data'];
export type LogRateAnalysisAttachmentData = LogRateAnalysisAttachmentPayload['data'];
export type PatternAnalysisAttachmentData = PatternAnalysisAttachmentPayload['data'];
export {};
