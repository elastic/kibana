# @kbn/slo-constants

Lightweight SLO constants (`ALL_VALUE`, `SLO_GROUPINGS_PREFIX`, `SLO_STATUS`, `SLI_RETENTION_{MIN,MAX,DEFAULT}_PERIOD_DAYS`).

Import from this package instead of `@kbn/slo-schema` when only constants are needed: importing `@kbn/slo-schema` loads every io-ts and zod schema in the package.
