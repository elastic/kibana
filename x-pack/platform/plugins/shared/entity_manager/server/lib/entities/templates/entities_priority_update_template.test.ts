/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinition } from '../helpers/fixtures';
import { generateEntitiesPriorityUpdateIndexTemplateConfig } from './entities_priority_update_template';

describe('generateEntitiesPriorityUpdateIndexTemplateConfig(definition)', () => {
  it('should generate a valid index template for custom definition', () => {
    const template = generateEntitiesPriorityUpdateIndexTemplateConfig(entityDefinition);
    expect(template).toMatchSnapshot();
  });
});
