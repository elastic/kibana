import { uiRegistry } from 'ui/registry/_registry';

export const RegistryFieldFormatEditorsProvider = uiRegistry({
  name: 'fieldFormatEditors',
  index: ['formatId'],
  constructor: function () {
    this.getEditor = function (formatId) {
      return this.byFormatId[formatId];
    };
  }
});

