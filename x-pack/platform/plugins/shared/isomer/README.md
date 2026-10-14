# Isomer

Hosts Kibana's shared Isomer runtime with its primitive packs. The server-only plugin is always enabled and registers no routes, saved objects, or UI.

Its start contract carries `getRuntime()`, which resolves a `createKibanaIsomerRuntime` with the components pack (`@kbn/isomer-components`) and the charts pack (`@kbn/isomer-primitives-charts`). Charts render as their summaries and data tables. Primitive schemas stay in memory for the life of the process once built, so the runtime and its packs load on the first call rather than at startup, and every later call shares that runtime. Call `getRuntime()` when a request needs it, not during `setup` or `start`.
