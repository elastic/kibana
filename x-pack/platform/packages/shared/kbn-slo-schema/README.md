# @kbn/slo-schema

This shared package contains the io-ts schema definition for the observability SLO project.
As well as the REST API schema specs and some common models that can be reused between public/ and server/, as the Duration model.

## Writing schemas

Zod schemas in this package are imported by the SLO plugin, and transitively by other plugins
(APM, Observability, Synthetics), even when SLO is not used. They must not cost memory until
they are used.

- Wrap every module-level zod schema in `lazySchema(() => …)` from `@kbn/zod`. Importing a
  schema module then only allocates a proxy; the real schema is built on first use and can be
  garbage collected once nothing holds it.
- Do not chain on or read from a schema at module level (`.extend()`, `.partial()`, `.pick()`,
  `.optional()`, `.describe()`, `.meta()`, `.shape`, `.options`, `.parse()`). That materializes
  and pins it. Do it inside another `lazySchema` factory.
- A schema with `.meta({ id })` must be its own module-level `lazySchema` const and must never be
  built inside another factory. Rebuilding the parent would register the id again and break OAS
  generation with "Duplicate schema id" (see [#296226](https://github.com/elastic/kibana/pull/296226)).
- In hot loops, keep a strong reference to what the proxy hands out (a bound method such as
  `const { safeParse } = schema`, or a derived schema), not to the proxy itself, otherwise a GC
  between calls forces a rebuild (see [#295609](https://github.com/elastic/kibana/pull/295609)
  and the Synthetics [runtime types README](../../../../solutions/observability/plugins/synthetics/common/runtime_types/README.md)).

`src/lazy_schemas.test.ts` fails if importing the package builds a schema, or if a schema
factory throws.
