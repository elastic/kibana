# @kbn/ml-server-schemas

Server-side schemas for ML APIs and embeddables.

This package is a `shared-server` package. Server code may import its schema values and schema-derived types. Common and browser code may only consume its exported types via `import type { ... } from '@kbn/ml-server-schemas/...';`.

Any browser-safe runtime values should live in a `shared-common` package such as `@kbn/ml-common-types`.

The package name reflects its runtime boundary: this package is server-only at runtime.
