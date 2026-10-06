/**
 * Per-field route validation bounds for licensing internal feature-usage APIs.
 *
 * `featureId` values in-repo top out at 44 chars (`geo_tile aggregation on
 * geo_shape field-type` in maps `licensed_features.ts`). `licenseType` is a
 * closed LICENSE_TYPE enum (longest key: `enterprise` = 10).
 */
/** Feature usage registration / notify identifier. */
export declare const MAX_LICENSING_FEATURE_ID_LENGTH = 128;
/** LICENSE_TYPE enum key (`basic` … `enterprise` / `trial`). */
export declare const MAX_LICENSING_LICENSE_TYPE_LENGTH = 16;
