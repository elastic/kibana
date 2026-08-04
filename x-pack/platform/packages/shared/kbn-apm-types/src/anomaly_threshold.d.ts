import { z } from '@kbn/zod/v4';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
export declare const anomalyThresholdSchema: z.ZodUnion<readonly [z.ZodLiteral<ML_ANOMALY_SEVERITY.CRITICAL>, z.ZodLiteral<ML_ANOMALY_SEVERITY.MAJOR>, z.ZodLiteral<ML_ANOMALY_SEVERITY.MINOR>, z.ZodLiteral<ML_ANOMALY_SEVERITY.WARNING>, z.ZodLiteral<ML_ANOMALY_SEVERITY.LOW>, z.ZodLiteral<"none">]>;
export type AnomalyThreshold = z.infer<typeof anomalyThresholdSchema>;
