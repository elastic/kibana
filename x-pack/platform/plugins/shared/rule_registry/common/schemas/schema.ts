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
import {} from '@kbn/rule-data-utils';

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
    ? Array<Expand<ConvertSchemaType<ModelVersion, N['fields']>>>
    : Expand<ConvertSchemaType<ModelVersion, N['fields']>>
  : N['type'];

// TODO: recreate type to build read schema from a SchemaType, given the original modelversion

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
    type: object;
    version: Version870;
    fields: {
      [key: string]: {
        type: unknown;
        version: Version870;
      };
    };
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
export type SuppressionFieldsLatest = ConvertSchemaType<string, SuppressionFieldsSchema>;

export type AlertWithCommonFieldsLatest<T> = T & CommonAlertFieldsLatest;

type Version800 = '8.0.0';
type Version860 = '8.6.0';
type Version870 = '8.7.0';
type Version880 = '8.8.0';
