import { uiRegistry } from 'ui/registry/_registry';

export const FeatureCatalogueRegistryProvider = uiRegistry({
  name: 'featureCatalogue',
  index: ['id'],
  group: ['category'],
  order: ['title']
});

export const FeatureCatalogueCategory = {
  ADMIN: 'admin',
  DATA: 'data',
  OTHER: 'other'
};
