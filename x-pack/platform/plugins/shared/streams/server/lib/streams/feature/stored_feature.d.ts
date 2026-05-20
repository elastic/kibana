import type { z } from '@kbn/zod/v4';
export declare const storedFeatureSchema: z.ZodObject<{
    "feature.type": z.ZodString;
    "feature.id": z.ZodString;
    "feature.uuid": z.ZodString;
    "feature.subtype": z.ZodOptional<z.ZodString>;
    "feature.description": z.ZodString;
    "stream.name": z.ZodString;
    "feature.properties": z.ZodRecord<z.ZodString, z.ZodAny>;
    "feature.confidence": z.ZodNumber;
    "feature.evidence": z.ZodOptional<z.ZodArray<z.ZodString>>;
    "feature.evidence_doc_ids": z.ZodOptional<z.ZodArray<z.ZodString>>;
    "feature.status": z.ZodEnum<{
        active: "active";
        expired: "expired";
        stale: "stale";
    }>;
    "feature.last_seen": z.ZodString;
    "feature.tags": z.ZodOptional<z.ZodArray<z.ZodString>>;
    "feature.meta": z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    "feature.expires_at": z.ZodOptional<z.ZodString>;
    "feature.excluded_at": z.ZodOptional<z.ZodString>;
    "feature.title": z.ZodOptional<z.ZodString>;
    "feature.filter": z.ZodOptional<z.ZodType<import("@kbn/streamlang/types/conditions").Condition, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang/types/conditions").Condition, unknown>>>;
    "feature.run_id": z.ZodOptional<z.ZodString>;
    "feature.search_embedding": z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type StoredFeature = z.infer<typeof storedFeatureSchema>;
