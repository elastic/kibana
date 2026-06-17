# @kbn/aiops-server-schemas

Server-side schemas for AIOps APIs and embeddables.

This package is a `shared-server` package. Server code may import its schema values and schema-derived types. Common and browser code may only consume its exported types via `import type { ... } from '@kbn/aiops-server-schemas/...';`.

Change point detection runtime constants should live in `@kbn/aiops-change-point-detection`; other browser-safe runtime values should live in the appropriate `shared-common` package.
