/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isLeft } from 'fp-ts/lib/Either';
import { configBlockSchemas } from './config_schemas';
import { ConfigurationBlock, createConfigurationBlockInterface } from './domain_types';

export const validateConfigurationBlocks = (configurationBlocks: ConfigurationBlock[]) => {
  const validationMap = {
    isHosts: t.array(t.string),
    isString: t.string,
    isPeriod: t.string,
    isPath: t.string,
    isPaths: t.array(t.string),
    isYaml: t.string,
  };

  for (const [index, block] of configurationBlocks.entries()) {
    const blockSchema = configBlockSchemas.find(s => s.id === block.type);
    if (!blockSchema) {
      throw new Error(
        `Invalid config type of ${block.type} used in 'configuration_blocks' at index ${index}`
      );
    }

    const interfaceConfig = blockSchema.configs.reduce((props, config) => {
      if (config.options) {
        props[config.id] = t.keyof(
          Object.fromEntries(config.options.map(opt => [opt.value, null])) as Record<string, null>
        );
      } else if (config.validation) {
        props[config.id] = validationMap[config.validation];
      }

      return props;
    }, {} as t.Props);

    const runtimeInterface = createConfigurationBlockInterface(
      t.literal(blockSchema.id),
      t.interface(interfaceConfig)
    );

    const validationResults = runtimeInterface.decode(block);

    if (isLeft(validationResults)) {
      throw new Error(
        `configuration_blocks validation error, configuration_blocks at index ${index} is invalid. ${
          PathReporter.report(validationResults)[0]
        }`
      );
    }
  }
};
