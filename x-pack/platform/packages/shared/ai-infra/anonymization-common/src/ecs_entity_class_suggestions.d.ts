import type { AnonymizationEntityClass } from './schemas';
/**
 * Maps known ECS (and Kibana-specific) field paths to their canonical
 * anonymization entity class. Used to auto-suggest entity classes in the UI
 * when a user is building a new anonymization profile, and to populate
 * default field rules when profiles are automatically initialized.
 *
 * Fields not present in this map should be left to the user to classify.
 */
export declare const ECS_ENTITY_CLASS_MAP: Readonly<Record<string, AnonymizationEntityClass>>;
/**
 * Returns the suggested `AnonymizationEntityClass` for a given ECS field path,
 * or `undefined` if no mapping is known for that field.
 *
 * Intended for two use cases:
 *  1. UI suggestions — auto-populate the entity class picker when a user adds a
 *     field to a profile.
 *  2. Programmatic profile initialization — populate `entityClass` on default
 *     field rules without hard-coding the mapping in the consumer.
 *
 * @example
 * suggestEntityClassForField('host.name')         // → 'HOST_NAME'
 * suggestEntityClassForField('source.ip')         // → 'IP'
 * suggestEntityClassForField('kibana.alert.rule.name') // → undefined
 */
export declare const suggestEntityClassForField: (fieldPath: string) => AnonymizationEntityClass | undefined;
