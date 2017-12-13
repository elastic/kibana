import expect from 'expect.js';

import { PluginPack } from '../../../plugin_discovery';

import { collectUiExports } from '../collect_ui_exports';

const specs = new PluginPack({
  path: '/dev/null',
  pkg: {
    name: 'test',
    version: 'kibana'
  },
  provider({ Plugin }) {
    return [
      new Plugin({
        id: 'test',
        uiExports: {
          visTypes: [
            'plugin/test/visType1',
            'plugin/test/visType2',
            'plugin/test/visType3',
          ]
        }
      }),
      new Plugin({
        id: 'test2',
        uiExports: {
          visTypes: [
            'plugin/test2/visType1',
            'plugin/test2/visType2',
            'plugin/test2/visType3',
          ]
        }
      }),
    ];
  }
}).getPluginSpecs();

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
