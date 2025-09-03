# @kbn/ml-common-api-schemas

This package provides schema definitions for validating ML API requests and responses. At the moment just the type `SupportedPath` gets used as part of `JsonSchemaQuerySchema`. Having this package and just exporting/using the type is a workaround to avoid client side bundle bloat due to `@kbn/config-schema`.
