# Isomer

Hosts an Isomer runtime with Kibana's primitive packs, so features built on Isomer validate and render compositions through one place. It registers nothing for other plugins; they depend on it and call its contracts. It is server-only and disabled by default.

```yaml
xpack.isomer.enabled: true
```

Its start contract carries `runtime`, a `createKibanaIsomerRuntime` with `@kbn/isomer-components`' `componentsPack`.
