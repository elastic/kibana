import { uiRegistry } from './_registry';

export const FeatureCatalogueRegistryProvider = uiRegistry({
  name: 'featureCatalogue',
  index: ['id'],
  group: ['category'],
  order: ['title'],
  filter: featureCatalogItem => Object.keys(featureCatalogItem).length > 0
});

export const FeatureCatalogueCategory = {
  ADMIN: 'admin',
  DATA: 'data',
  OTHER: 'other'
};
