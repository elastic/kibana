import ManagementSection from './section';

const sections = new ManagementSection('management', {
  display: 'Management'
});

// TODO: where should this live?
sections.register('data', {
  display: 'Connect Data',
  order: 0
});

sections.register('elasticsearch', {
  display: 'Elasticsearch',
  order: 10
});

sections.register('kibana', {
  display: 'Kibana',
  order: 20,
});

export default sections;
