import { uiRegistry } from 'ui/registry/_registry';

/**
 * Registry of tutorials for data integration.
 *
 * Example: logstash and beats modules.
 * A module is an ingest pipeline, an ES template, and Kibana objects
 * catering to a specific use case (e.g. ingesting and analyzing apache logs)
 */
export const TutorialsRegistryProvider = uiRegistry({
  name: 'tutorials',
  index: ['id'],
  order: ['name']
});
