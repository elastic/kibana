import { uiRegistry } from './_registry';

export const RegistryFieldFormatEditorsProvider = uiRegistry({
  name: 'fieldFormatEditors',
  index: ['formatId'],
  constructor: function () {
    this.getEditor = function (formatId) {
      return this.byFormatId[formatId];
    };
  }
});

