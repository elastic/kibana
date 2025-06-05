# TypeScript Type Refactoring for SavedObjectsType

This document summarizes different approaches to allow entries in `modelVersions` to define their own generic types for property members like `transformFn`.

## The Problem

The current `SavedObjectsType` interface doesn't allow for specifying different generic types for each model version entry, particularly problematic for the `unsafe_transform` type and its `transformFn` property.

## Solution 1: Minimal Change with Type Assertions

This approach makes minimal changes to existing types and uses type assertions at usage sites.

```typescript
// In transformations.ts
export type SavedObjectModelUnsafeTransformFn = SavedObjectModelTransformationFn<any, any>;

// In entity_definition.ts
const removeOptionalIdentityFields = ((savedObject) => {
  // Implementation...
  return {
    document: savedObject as SavedObjectModelTransformationDoc<EntityDefinition>,
  };
}) as SavedObjectModelUnsafeTransformFn<EntityDefinition, EntityDefinition>;
```

## Solution 2: Modify SavedObjectsModelChange

This approach focuses on updating the `SavedObjectsModelChange` type to support generics for unsafe transforms:

```typescript
export type SavedObjectsModelChange =
  | SavedObjectsModelMappingsAdditionChange
  | SavedObjectsModelMappingsDeprecationChange
  | SavedObjectsModelDataBackfillChange
  | SavedObjectsModelDataRemovalChange
  | SavedObjectsModelUnsafeTransformChange<any, any>;
```

## Solution 3: Full Generic Support with Variadic Generics

This more comprehensive approach allows full type safety by updating the SavedObjectsType interface:

```typescript
// Define version-specific types
export interface SavedObjectsType<
  Attributes = any,
  ModelVersions extends Record<string, {
    TransformTypes?: Array<{ InputAttr: any; OutputAttr: any }>;
    InputAttr?: any;
    OutputAttr?: any;
  }> = Record<string, {}>
> {
  // ...
  modelVersions?: {
    [Version in keyof ModelVersions]?: {
      changes: Array<
        | SavedObjectsModelMappingsAdditionChange
        | SavedObjectsModelMappingsDeprecationChange
        | SavedObjectsModelDataBackfillChange
        | SavedObjectsModelDataRemovalChange
        | (ModelVersions[Version] extends { TransformTypes: Array<infer T> }
            ? {
                [I in keyof ModelVersions[Version]['TransformTypes']]:
                  SavedObjectsModelUnsafeTransformChange<
                    ModelVersions[Version]['TransformTypes'][I]['InputAttr'],
                    ModelVersions[Version]['TransformTypes'][I]['OutputAttr']
                  >
              }[number]
            : SavedObjectsModelUnsafeTransformChange<
                ModelVersions[Version]['InputAttr'],
                ModelVersions[Version]['OutputAttr']
              >)
      >;
      schemas?: SavedObjectsModelVersionSchemaDefinitions;
    };
  };
  // ...
}
```

With usage in an entity definition file:

```typescript
// Define the specific model version types
type EntityDefVersions = {
  '1': {}; // No special types needed
  '2': {}; // No special types needed
  '3': {}; // No special types needed
  '4': {
    // For multiple transforms in the same version, define a tuple of transform types
    TransformTypes: [
      { // First transform
        InputAttr: EntityDefinition;
        OutputAttr: EntityDefinition;
      },
      { // Second transform with different types
        InputAttr: AnotherType;
        OutputAttr: YetAnotherType;
      }
    ];
  };
};

export const entityDefinition: SavedObjectsType<EntityDefinition, EntityDefVersions> = {
  // ...implementation
};
```

## Multiple Transforms in a Version

The final solution supports having multiple transforms with different types in a single version by using a `TransformTypes` array in the version definition.

## Conclusion

While the minimal change approach requires fewer modifications to the core types, the comprehensive solution with variadic generics provides better type safety and developer experience at the cost of more complex type definitions.
