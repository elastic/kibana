# Isomer

Hosts an Isomer runtime with Kibana's primitive packs, so features built on Isomer validate and render compositions through one place. It registers nothing for other plugins; they depend on it and call its contracts. It is server-only and disabled by default.

```yaml
xpack.isomer.enabled: true
```

Its start contract carries `getRuntime()`, which resolves a `createKibanaIsomerRuntime` with `@kbn/isomer-components`' `componentsPack`. Primitive schemas stay in memory for the life of the process once built, so the runtime and its packs load on the first call rather than at startup, and every later call shares that runtime. Call `getRuntime()` when a request needs it, not during `setup` or `start`.
