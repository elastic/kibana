import { uiRegistry } from 'ui/registry/_registry';

/**
 * Registry of tutorials for integrating data sources into the Elastic stack.
 *
 * One category of tutorials are logstash and beats modules.
 * A logstash/beats module is an ingest pipeline, an ES template, and Kibana objects
 * catering to a specific use case (e.g. ingesting and analyzing apache logs)
 */
export const TutorialsRegistryProvider = uiRegistry({
  name: 'tutorials',
  index: ['name'],
  order: ['name']
});
