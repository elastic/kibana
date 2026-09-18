/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RawConnectorSpecAsset {
  yamlPath: string;
  yaml: string;
  iconPath?: string;
  icon?: string;
}

/**
 * Source of raw connector spec bytes. `CatalogSpecSource` fetches YAML/SVG
 * from the declarative catalog; parse and materialize stay independent of
 * how the bytes were obtained.
 */
export abstract class ConnectorSpecSource {
  abstract loadRawSpecs(): Promise<RawConnectorSpecAsset[]>;
}
