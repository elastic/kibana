# @kbn/custom-app-common

The document of a custom app, and the capabilities that ship with it.

```
index.ts        what other packages and plugins import
capabilities/   one file for each core capability (heading, stat, table ...), the list of them,
                and their registration with @kbn/custom-app-registry
document/       the document: its schema, its state and bindings, the schemas that capabilities
                share (actions, inputs, data fields), the checks that look across it, and the
                helpers that read a tree of nodes
```

`capabilities/` imports from `document/` and from `@kbn/custom-app-registry`. The registry knows
nothing about this package: a plugin that adds a capability depends on the registry and on the pieces
this package exports, and registers its own manifest.
