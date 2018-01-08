import mockFs from 'mock-fs';
import { resolve } from 'path';

const mockTemplate = `
{{appId}}
{{bundlePath}}
{{i18n 'foo'}}
`;

const templatePath = resolve(__dirname, 'template.js.hbs');

beforeEach(() => {
  mockFs({
    [templatePath]: mockTemplate
  });
});
afterEach(mockFs.restore);

import { AppBootstrap } from './app_bootstrap';

describe('ui_render/AppBootstrap', () => {
  describe('getJsFile()', () => {
    test('resolves to a string', async () => {
      expect.assertions(1);

      const boostrap = new AppBootstrap(mockConfig());
      const contents = await boostrap.getJsFile();

      expect(typeof contents).toEqual('string');
    });

    test('interpolates templateData into string template', async () => {
      expect.assertions(2);

      const boostrap = new AppBootstrap(mockConfig());
      const contents = await boostrap.getJsFile();

      expect(contents).toContain('123');
      expect(contents).toContain('/foo/bar');
    });

    test('supports i18n', async () => {
      expect.assertions(1);

      const boostrap = new AppBootstrap(mockConfig());
      const contents = await boostrap.getJsFile();

      expect(contents).toContain('translated foo');
    });
  });

  describe('getJsFileHash()', () => {
    test('resolves to a 40 character string', async () => {
      expect.assertions(2);

      const boostrap = new AppBootstrap(mockConfig());
      const hash = await boostrap.getJsFileHash();

      expect(typeof hash).toEqual('string');
      expect(hash).toHaveLength(40);
    });

    test('resolves to the same string for multiple calls with the same config on the same bootstrap object', async () => {
      expect.assertions(1);

      const boostrap = new AppBootstrap(mockConfig());
      const hash1 = await boostrap.getJsFileHash();
      const hash2 = await boostrap.getJsFileHash();

      expect(hash2).toEqual(hash1);
    });

    test('resolves to the same string for multiple calls with the same config on different bootstrap objects', async () => {
      expect.assertions(1);

      const boostrap1 = new AppBootstrap(mockConfig());
      const hash1 = await boostrap1.getJsFileHash();

      const bootstrap2 = new AppBootstrap(mockConfig());
      const hash2 = await bootstrap2.getJsFileHash();

      expect(hash2).toEqual(hash1);
    });

    test('resolves to different 40 character string with different templateData', async () => {
      expect.assertions(3);

      const boostrap1 = new AppBootstrap(mockConfig());
      const hash1 = await boostrap1.getJsFileHash();

      const config2 = {
        ...mockConfig(),
        templateData: {
          appId: 'not123',
          bundlePath: 'not/foo/bar'
        }
      };
      const bootstrap2 = new AppBootstrap(config2);
      const hash2 = await bootstrap2.getJsFileHash();

      expect(typeof hash2).toEqual('string');
      expect(hash2).toHaveLength(40);
      expect(hash2).not.toEqual(hash1);
    });

    test('resolves to different 40 character string with different translations', async () => {
      expect.assertions(3);

      const boostrap1 = new AppBootstrap(mockConfig());
      const hash1 = await boostrap1.getJsFileHash();

      const config2 = {
        ...mockConfig(),
        translations: {
          foo: 'not translated foo'
        }
      };
      const bootstrap2 = new AppBootstrap(config2);
      const hash2 = await bootstrap2.getJsFileHash();

      expect(typeof hash2).toEqual('string');
      expect(hash2).toHaveLength(40);
      expect(hash2).not.toEqual(hash1);
    });
  });
});

function mockConfig() {
  return {
    translations: {
      foo: 'translated foo'
    },
    templateData: {
      appId: 123,
      bundlePath: '/foo/bar'
    }
  };
}
