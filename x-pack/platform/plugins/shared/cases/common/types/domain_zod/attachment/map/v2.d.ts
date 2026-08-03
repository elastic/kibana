import { z } from '@kbn/zod/v4';
export declare const MapAttachmentMetadataSchema: z.ZodObject<{
    title: z.ZodString;
    soType: z.ZodLiteral<"map">;
}, z.core.$strict>;
/**
 * Structural subset of `MapAttributes` (the CM/REST format the maps content
 * client returns — parsed `layers`/`center`/`settings`). Declared as Zod here
 * (rather than importing `@kbn/maps-plugin/server` types) so this schema
 * stays usable from the `common/` layer and the public bundle. Field shapes
 * are intentionally loose — they're forwarded verbatim to the `<maps.Map />`
 * renderer, which is the authority on what it accepts.
 *
 * `.loose()` (passthrough) is used on purpose: the embeddable snapshot the
 * maps plugin produces at attach time includes runtime extras such as
 * `filters`, `query`, `refreshInterval`, `timeFilters`, and `openTOCDetails`
 * which the renderer needs but cases doesn't model explicitly. The listed
 * fields below are the ones cases relies on / guards against drift, not an
 * exhaustive contract.
 *
 * The compile-time tripwire `MapSnapshotMatchesMapAttributes` lives in
 * `public/components/attachments/map/map_embed_attachment.tsx` (where the
 * maps types are reachable) and fails typecheck if maps drops or renames any
 * of the fields we forward here.
 */
export declare const MapAttributesSnapshotSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    layers: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    center: z.ZodOptional<z.ZodObject<{
        lat: z.ZodNumber;
        lon: z.ZodNumber;
    }, z.core.$strict>>;
    zoom: z.ZodOptional<z.ZodNumber>;
    settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    isLayerTOCOpen: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>;
/**
 * `attributes` is required when `data` is present so the renderer can always
 * embed inline; `timeRange` is an optional override on top of the snapshot.
 */
export declare const MapAttachmentDataSchema: z.ZodObject<{
    attributes: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        layers: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
        center: z.ZodOptional<z.ZodObject<{
            lat: z.ZodNumber;
            lon: z.ZodNumber;
        }, z.core.$strict>>;
        zoom: z.ZodOptional<z.ZodNumber>;
        settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        isLayerTOCOpen: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$loose>;
    timeRange: z.ZodOptional<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        mode: z.ZodOptional<z.ZodEnum<{
            absolute: "absolute";
            relative: "relative";
        }>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const MapAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"map">;
    owner: z.ZodString;
    attachmentId: z.ZodString;
    metadata: z.ZodObject<{
        title: z.ZodString;
        soType: z.ZodLiteral<"map">;
    }, z.core.$strict>;
    data: z.ZodOptional<z.ZodObject<{
        attributes: z.ZodObject<{
            title: z.ZodOptional<z.ZodString>;
            layers: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
            center: z.ZodOptional<z.ZodObject<{
                lat: z.ZodNumber;
                lon: z.ZodNumber;
            }, z.core.$strict>>;
            zoom: z.ZodOptional<z.ZodNumber>;
            settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            isLayerTOCOpen: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$loose>;
        timeRange: z.ZodOptional<z.ZodObject<{
            from: z.ZodString;
            to: z.ZodString;
            mode: z.ZodOptional<z.ZodEnum<{
                absolute: "absolute";
                relative: "relative";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type MapAttributesSnapshot = z.infer<typeof MapAttributesSnapshotSchema>;
export type MapAttachmentMetadata = z.infer<typeof MapAttachmentMetadataSchema>;
export type MapAttachmentData = z.infer<typeof MapAttachmentDataSchema>;
export type MapAttachmentPayload = z.infer<typeof MapAttachmentPayloadSchema>;
