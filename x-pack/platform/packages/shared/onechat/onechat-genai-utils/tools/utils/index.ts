/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { esqlResponseToJson, extractEsqlQueries, executeEsql, interpolateEsqlQuery } from './esql';
export {
  flattenMapping,
  cleanupMapping,
  getIndexMappings,
  getDataStreamMappings,
  type MappingField,
} from './mappings';
export { processFieldCapsResponse, type FieldListFromFieldCapsResponse } from './field_caps';
export { generateXmlTree, type XmlNode } from './formatting';
