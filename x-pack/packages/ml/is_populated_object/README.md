# @kbn/ml-is-populated-object

<!-- INSERT GENERATED DOCS START -->

### `isPopulatedObject` (function)

A type guard to check record like object structures.

Examples:

- `isPopulatedObject({...})`
  Limits type to Record<string, unknown>

- `isPopulatedObject({...}, ['attribute'])`
  Limits type to Record<'attribute', unknown>

- `isPopulatedObject<keyof MyInterface>({...})`
  Limits type to a record with keys of the given interface.
  Note that you might want to add keys from the interface to the
  array of requiredAttributes to satisfy runtime requirements.
  Otherwise you'd just satisfy TS requirements but might still
  run into runtime issues.

<!-- INSERT GENERATED DOCS END -->
