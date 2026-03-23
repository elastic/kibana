/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ALERT_INSTANCE_ID,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  SPACE_IDS,
  TIMESTAMP,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_REVISION,
} from '@kbn/rule-data-utils';

/**
 * The types in this file create a system for defining a versioned schema and deriving read and write schemas for any specific version
 * from a single schema definition. See x-pack/solutions/security/plugins/security_solution/common/api/detection_engine/model/alerts/schema.ts
 * for a more complex use case involving nesting and arrays of objects.
 *
 * To convert the single schema type into a schema for a specific version or set of versions, `ConvertSchemaType` maps over
 * each key and filters out keys that don't match the provided version(s). It then converts the associated value (a SchemaNode)
 * with `ConvertSchemaNode`. `ConvertSchemaNode` either (a) recursively calls `ConvertSchemaType` on each subfield,
 * if there are subfields (i.e. if the node type matches `SchemaInternalNode), or (b) simply sets the type of the resulting
 * field to the `type` specified in the node.
 *
 * Each node specifies which version the node was added in as a specific string type. The node type should correspond to how we'll
 * *write* the field going forward - so a field that will be required in future alerts would be `string`, `number`, etc. An optional new field
 * can be `string | undefined`, `number | undefined`, etc. `ConvertSchemaTypeToReadSchema` takes care of building a combined schema
 * from *all* versions where new required fields that were not in the original schema version may be undefined in existing documents.
 *
 * If you want the schema from a specific version, use `ConvertSchemaType` and pass that version and all prior versions as a union type,
 * e.g. `ConvertSchemaType<'8.0.0' | '8.4.0', Schema>` will yield the read and write schema for 8.4.0 alerts. This is useful if you want
 * to do some specific logic on 8.4+ alerts.
 *
 * Passing `string` in as the version i.e. `ConvertSchemaType<string, Schema>` is a useful shorthand to get the latest schema. Since
 * all versions extend `string`, all versions will be included.
 */

export type LeafNodeTypes =
  | object
  | object[]
  | string
  | string[]
  | number
  | number[]
  | boolean
  | boolean[]
  | null
  | undefined;
export interface SchemaLeafNode {
  type: LeafNodeTypes;
  version: string;
}

export type InternalNodeTypes = object | object[];
export interface SchemaInternalNode {
  type: InternalNodeTypes;
  version: string;
  fields: SchemaType;
}

export type SchemaNode = SchemaLeafNode | SchemaInternalNode;

export type SchemaType = Record<string, SchemaNode>;

/** 
 * This type is a no-op: Expand<T> evaluates to T. Its use is to force VSCode to evaluate type expressions
 * and show the expanded form, e.g.
 * type test5 = {
        "@timestamp": string;
        newField: string;
        newFieldWithSubfields: {
            subfield: string;
        };
    }
 * instead of
 *  type test5 = {
        "@timestamp": string;
        newField: string;
        newFieldWithSubfields: Converter<ModelVersion3, {
            subfield: {
                type: string;
                version: 3;
            };
        }>;
    }
 * */
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type ConvertSchemaType<ModelVersion extends string, Schema extends SchemaType> = Expand<{
  // Key remapping via `as` here filters out keys that are not in that schema version,
  // so instead of { key: undefined } the key is completely gone
  // https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#key-remapping-via-as
  [k in keyof Schema as Required<Schema>[k]['version'] extends ModelVersion
    ? k
    : never]: ConvertSchemaNode<ModelVersion, Required<Schema>[k]>;
}>;

export type ConvertSchemaNode<
  ModelVersion extends string,
  N extends SchemaNode
> = N extends SchemaInternalNode
  ? N['type'] extends object[]
    ? Array<ConvertSchemaType<ModelVersion, N['fields']>>
    : ConvertSchemaType<ModelVersion, N['fields']>
  : N['type'];

export type ConvertSchemaTypeToReadSchema<
  OriginalVersion extends string,
  Schema extends SchemaType
> = Expand<{
  [k in keyof Schema]: Required<Schema>[k]['version'] extends OriginalVersion
    ? ConvertSchemaNode<OriginalVersion, Required<Schema>[k]>
    : ConvertSchemaNode<OriginalVersion, Required<Schema>[k]> | undefined;
}>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CommonAlertFieldsSchema = {
  [ALERT_RULE_CATEGORY]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_CONSUMER]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_EXECUTION_UUID]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_NAME]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_PRODUCER]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_TYPE_ID]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_UUID]: {
    type: string;
    version: Version800;
  };
  [SPACE_IDS]: {
    type: string[];
    version: Version800;
  };
  [ALERT_RULE_TAGS]: {
    type: string[];
    version: Version800;
  };
  [TIMESTAMP]: {
    type: string;
    version: Version800;
  };
  [ALERT_RULE_PARAMETERS]: {
    type: {
      [key: string]: unknown;
    };
    version: Version870;
  };
  [ALERT_RULE_REVISION]: {
    type: number;
    version: Version880;
  };
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type SuppressionFieldsSchema = {
  [ALERT_SUPPRESSION_TERMS]: {
    type: object[];
    version: Version860;
    fields: {
      field: { type: string; version: Version860 };
      value: { type: LeafNodeTypes; version: Version860 };
    };
  };
  [ALERT_SUPPRESSION_START]: {
    type: Date;
    version: Version860;
  };
  [ALERT_SUPPRESSION_END]: { type: Date; version: Version860 };
  [ALERT_SUPPRESSION_DOCS_COUNT]: { type: number; version: Version860 };
  [ALERT_INSTANCE_ID]: {
    type: string;
    version: Version870;
  };
};

export type CommonAlertFieldsLatest = ConvertSchemaType<string, CommonAlertFieldsSchema>;
export type CommonAlertFields870 = ConvertSchemaType<Version870Union, CommonAlertFieldsSchema>;

export type SuppressionFieldsLatest = ConvertSchemaType<string, SuppressionFieldsSchema>;
export type SuppressionFields870 = ConvertSchemaType<Version870Union, SuppressionFieldsSchema>;

export type AlertWithCommonFieldsLatest<T> = T & CommonAlertFieldsLatest;

type Version800 = '8.0.0';
type Version860 = '8.6.0';
type Version870 = '8.7.0';
type Version880 = '8.8.0';
type Version870Union = Version800 | Version860 | Version870;
