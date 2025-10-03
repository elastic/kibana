/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinition } from '../helpers/fixtures';
import { generateEntitiesUpdatesIndexTemplateConfig } from './entities_updates_template';

describe('generateEntitiesUpdatesIndexTemplateConfig(definition)', () => {
  it('should generate a valid index template for custom definition', () => {
    const template = generateEntitiesUpdatesIndexTemplateConfig(entityDefinition);
    expect(template).toMatchSnapshot();
  });
});
