# Presentation fields of the dynamic block

The `dynamic` block of an entity definition (`dynamic_block_schema.ts`) can declare how the inventory presents its type in the results list. The fields are optional and presentation only: the inventory's generator never reads them. The inventory's `types` response returns them as declared, and leaves a field out when the definition does, so the app can tell a type without metadata from one with it and apply its own fallbacks.

The sources, attributes, `displayLabels` and `suggestedFilters` of the block are described in the [entity store README](../../../../README.md). This page covers the presentation fields added to the block's root.

```ts
dynamic: {
  sources: [
    {
      indexPattern: 'metrics-kubernetes.state_pod-*',
      filter: 'metricset.name == "state_pod"',
      attributes: [
        { name: 'namespace', field: 'kubernetes.namespace' },
        { name: 'k8s.pod.name', field: 'kubernetes.pod.name' },
        { name: 'phase', field: 'kubernetes.pod.status.phase', valueLabels: { Running: 'running' } },
      ],
    },
  ],
  displayLabels: [{ name: 'namespace', label: 'Namespace' }],
  suggestedFilters: ['namespace', 'phase'],
  category: 'kubernetes',
  icon: 'logoKubernetes',
  nameFields: ['k8s.pod.name'],
  defaultColumns: ['namespace', 'phase', 'last_seen'],
  badgeColumns: ['phase'],
},
```

## Fields

Each name in the three lists is a literal field path of at most 512 characters, and none is repeated within its list.

- `category`: the inventory page the type is listed under, such as `hosts` or `kubernetes`. A slug of 1 to 64 lowercase letters, digits, `_` and `-`.
- `icon`: the icon shown beside the entity name, 1 to 64 characters. The store does not interpret it; the inventory reads it as an EUI icon token.
- `nameFields`: the columns tried in order for the entity name; the first non-null value names the entity. 1 to 16 names.
- `defaultColumns`: the columns visible by default, in display order. At most 521 names (every identity field and attribute, plus `last_seen`).
- `badgeColumns`: the columns whose values render as badges. At most 16 names.

## Rules

Three whole-definition rules apply to these lists only when `dynamic` is present, at both `entitySchema` and registration. They come on top of the rules listed in the entity store README.

- Every name field is an identity field or an attribute of some source, but not `entity.id`.
- Every default column is an identity field, an attribute of some source or `last_seen`, but not `entity.id`.
- Every badge column is an identity field or an attribute of some source, but not `entity.id`.

The rules are implemented in `dynamic_definition_rules.ts` and share one helper with the `suggestedFilters` check.

## Translation

Text a definition authors (`displayLabels`, `valueLabels`) is shown as is, untranslated: definitions are data that customers will edit.
