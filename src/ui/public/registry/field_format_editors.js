import { uiRegistry } from 'ui/registry/_registry';

export const RegistryFieldFormatEditorsProvider = uiRegistry({
  name: 'fieldFormatEditors',
  constructor: function () {
    this.getEditor = function (formatId) {
      return this.raw.find((editor) => {
        return editor.formats.includes(formatId);
      });
    };
  }
});

