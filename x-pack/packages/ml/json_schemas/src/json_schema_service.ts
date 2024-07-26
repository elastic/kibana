/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { jsonSchemaOverrides } from './schema_overrides';
import { type PropertyDefinition } from './types';

export type EditorEndpoints = (typeof supportedEndpoints)[number]['path'];

const supportedEndpoints = [
  {
    path: '/_ml/anomaly_detectors/{job_id}' as const,
    method: 'put',
  },
  {
    path: '/_ml/datafeeds/{datafeed_id}' as const,
    method: 'put',
  },
  {
    path: '/_transform/{transform_id}' as const,
    method: 'put',
    props: ['pivot'],
  },
  {
    path: '/_ml/data_frame/analytics/{id}' as const,
    method: 'put',
  },
];

/**
 *
 */
export class JsonSchemaService {
  constructor(
    // By default assume that openapi file is in the next to Kibana folder
    private readonly pathToOpenAPI: string = Path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      '..',
      '..',
      'elasticsearch-specification',
      'output',
      'openapi',
      'elasticsearch-serverless-openapi.json'
    )
  ) {}

  private applyOverrides(path: EditorEndpoints, schema: PropertyDefinition): PropertyDefinition {
    const overrides = jsonSchemaOverrides[path];

    if (!overrides) return schema;

    return {
      ...schema,
      ...overrides,
      properties: {
        ...schema.properties,
        ...overrides.properties,
      },
    };
  }

  private allComponents: Record<string, object> = {};
  private componentsDict = new Set<string>();

  /**
   * Extracts only used components
   */
  private extractComponents(bodySchema: object) {
    for (const prop of Object.values(bodySchema)) {
      if (typeof prop !== 'object' || !prop) {
        continue;
      }

      // Check if prop contains a $ref
      if (prop.$ref) {
        if (!this.componentsDict.has(prop.$ref)) {
          this.componentsDict.add(prop.$ref);
          // Check all references of this ref
          const schemaKey: string = prop.$ref.split('/').pop()!;
          // @ts-ignore
          this.extractComponents(this.allComponents.schemas[schemaKey]);
        }
      }

      this.extractComponents(prop);
    }
  }

  public async resolveSchema(
    path: EditorEndpoints,
    method: string,
    props?: string[],
    schema?: object
  ) {
    const fileContent =
      schema ?? JSON.parse(Fs.readFileSync(Path.resolve(__dirname, 'openapi.json'), 'utf8'));

    const definition = fileContent.paths[path][method];

    if (!definition) {
      throw new Error('Schema definition is not defined');
    }

    let bodySchema = definition.requestBody.content['application/json'].schema;

    // Store components for a later use, to extract only used components
    this.allComponents = fileContent.components;

    if (props) {
      // Only extract requested properties from the schema
      const propDef = bodySchema.properties[props[0]];
      if (propDef.$ref) {
        bodySchema = fileContent.components.schemas[propDef.$ref.split('/').pop()!];
      }
    }

    bodySchema = this.applyOverrides(path, bodySchema);

    // Extract only used components
    this.extractComponents(bodySchema);

    const components = Array.from(this.componentsDict).reduce(
      (acc, ref) => {
        // Split component path
        const componentName = ref.split('/').pop()!;
        // @ts-ignore
        acc.schemas[componentName] = fileContent.components.schemas[componentName];
        return acc;
      },
      { schemas: {} }
    );

    return {
      ...bodySchema,
      components,
    };
  }

  /**
   * Generates schema files for each supported endpoint from the openapi file.
   */
  public async createSchemaFiles() {
    const schema = JSON.parse(Fs.readFileSync(this.pathToOpenAPI, 'utf8'));

    await Promise.all(
      supportedEndpoints.map(async (e) => {
        // need to extract schema in order to keep required components
        this.componentsDict.clear();
        const result = await this.resolveSchema(e.path, e.method, e.props, schema);
        Fs.writeFileSync(
          Path.resolve(
            __dirname,
            `${e.method}_${e.path.replace(/[\{\}\/]/g, '_')}${
              e.props ? '__' + e.props.join('_') : ''
            }_schema.json`
          ),
          JSON.stringify(result, null, 2)
        );
      })
    );
  }
}
