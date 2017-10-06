import { uiRegistry } from 'ui/registry/_registry';

export const KbnDirectoryRegistryProvider = uiRegistry({
  name: 'kbnDirectory',
  index: ['id'],
  group: ['category'],
  order: ['title']
});

export const DirectoryCategory = {
  ADMIN: 'admin',
  DATA: 'data',
  OTHER: 'other'
};
