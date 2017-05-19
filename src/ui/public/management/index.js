import { ManagementSection } from './section';

export const management = new ManagementSection('management', {
  display: 'Management'
});

// TODO: where should this live?
management.register('data', {
  display: 'Connect Data',
  order: 0
});

management.register('elasticsearch', {
  display: 'Elasticsearch',
  order: 20
});

management.register('kibana', {
  display: 'Kibana',
  order: 30,
});

