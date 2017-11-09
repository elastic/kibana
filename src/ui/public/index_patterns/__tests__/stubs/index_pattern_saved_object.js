import { createStubLogstashFields } from './logstash_fields';
import { SavedObject } from 'ui/saved_objects';

export function createStubIndexPatternSavedObject(id) {
  return new SavedObject(undefined, {
    id,
    type: 'index-pattern',
    attributes: {
      customFormats: '{}',
      fields: JSON.stringify(createStubLogstashFields())
    },
    version: 2
  });
}
