/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { MappingsEditor } from './mappings_editor';
export { MappedFieldsEditor } from './mapped_fields_editor';
export { MappedFieldsEditorWithContext } from './mapped_fields_editor_with_context';

// We export both the button & the load mappings provider
// to give flexibility to the consumer
export { LoadMappingsFromJsonButton, LoadMappingsProvider } from './components/load_mappings';

export { MappingsEditorProvider } from './mappings_editor_context';

export type { IndexSettings, OnUpdateHandler } from './types';
