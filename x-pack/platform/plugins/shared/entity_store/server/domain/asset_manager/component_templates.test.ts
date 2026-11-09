/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Backward-compatibility snapshots for the Elasticsearch assets generated from the four built-in
 * Security definitions. A Security entity store install on a fresh space must create exactly the
 * same component templates and index templates after the definition schema refactor.
 */

import { ALL_ENTITY_TYPES } from '../../../common/domain/definitions/entity_schema';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import {
  getEntityDefinitionComponentTemplate,
  getUpdatesEntityDefinitionComponentTemplate,
} from './component_templates';
import { getLatestEntityIndexTemplateConfig } from './latest_index_template';
import { getHistorySnapshotIndexTemplateConfig } from './history_snapshot_index_template';

const NAMESPACE = 'default';

describe('built-in definition Elasticsearch assets (backward compatibility)', () => {
  describe.each(ALL_ENTITY_TYPES)('%s', (type) => {
    it('latest component template', () => {
      const definition = getEntityDefinition(type, NAMESPACE);
      expect(getEntityDefinitionComponentTemplate(definition, NAMESPACE)).toMatchSnapshot();
    });

    it('updates component template', () => {
      const definition = getEntityDefinition(type, NAMESPACE);
      expect(getUpdatesEntityDefinitionComponentTemplate(definition, NAMESPACE)).toMatchSnapshot();
    });
  });

  it('latest index template', () => {
    expect(getLatestEntityIndexTemplateConfig(NAMESPACE)).toMatchSnapshot();
  });

  it('history snapshot index template', () => {
    expect(getHistorySnapshotIndexTemplateConfig(NAMESPACE)).toMatchSnapshot();
  });
});
