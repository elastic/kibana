# @kbn/resource-bootstrap-server

What a plugin needs to register a resource kind with the resource bootstrap plugin
(`@kbn/resource-bootstrap-plugin`): the `ResourceKind` contract and the helpers that implement
common parts of it.

- `applyEach` writes resources one at a time and reports each failure under its resource's id.
- `toApplyError` describes a thrown error, marking client errors as `permanent` and conflicts as
  `conflict`.
- `createSavedObjectOwnership` gives the `ownership` of a kind stored as saved objects of one type.
- `NO_ATTRIBUTES` reads a saved object without its attributes.

A plugin registers its kind through the plugin's `registerResourceKind` setup contract; see the
plugin's README for how kinds are applied, owned and pruned.
