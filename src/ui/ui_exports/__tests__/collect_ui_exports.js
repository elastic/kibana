import expect from 'expect.js';

import { PluginSpec } from '../../../plugin_discovery';

import { collectUiExports } from '../collect_ui_exports';

const specs = [
  new PluginSpec('/dev/null', {
    id: 'test',
    version: 'kibana'
  },
  {
    uiExports: {
      visTypes: [
        'plugin/test/visType1',
        'plugin/test/visType2',
        'plugin/test/visType3',
      ]
    }
  }),
  new PluginSpec('/dev/null', {
    id: 'test2',
    version: 'kibana'
  },
  {
    uiExports: {
      visTypes: [
        'plugin/test2/visType1',
        'plugin/test2/visType2',
        'plugin/test2/visType3',
      ]
    }
  })
];

describe('plugin discovery', () => {
  describe('collectUiExports()', () => {
    it('merges uiExports from all provided plugin specs', () => {
      const uiExports = collectUiExports(specs);
      const exported = uiExports.appExtensions.visTypes
        .sort((a, b) => a.localeCompare(b));

      expect(exported).to.eql([
        'plugin/test/visType1',
        'plugin/test/visType2',
        'plugin/test/visType3',
        'plugin/test2/visType1',
        'plugin/test2/visType2',
        'plugin/test2/visType3'
      ]);
    });
  });
});
