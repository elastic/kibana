import expect from 'expect.js';

import { extractAppPathAndId } from '../extract_app_path_and_id';

describe('extractAppPathAndId', function () {
  describe('from an absolute url with a base path', function () {
    describe('with a base path', function () {
      const basePath = '/gza';
      const absoluteUrl = 'http:///www.test.com:5601/gza/app/appId#appPathIsHere?query=here';
      it('extracts app path', function () {
        expect(extractAppPathAndId(absoluteUrl, basePath).appPath).to.be('appPathIsHere?query=here');
      });

      it('extracts app id', function () {
        expect(extractAppPathAndId(absoluteUrl, basePath).appId).to.be('appId');
      });

      it('returns an empty object when there is no app path', function () {
        expect(extractAppPathAndId('http:///www.test.com:5601/gza/noapppath', basePath)).to.be({ });
      });
    });

    describe('without a base path', function () {
      const absoluteUrl = 'http:///www.test.com:5601/app/appId#appPathIsHere?query=here';
      it('extracts app path', function () {
        expect(extractAppPathAndId(absoluteUrl).appPath).to.be('appPathIsHere?query=here');
      });

      it('extracts app id', function () {
        expect(extractAppPathAndId(absoluteUrl).appId).to.be('appId');
      });

      it('returns an empty object when there is no app path', function () {
        expect(extractAppPathAndId('http:///www.test.com:5601/noapppath')).to.be({ });
      });
    });

    describe('when appPath is empty', function () {
      const absoluteUrl = 'http:///www.test.com:5601/app/appId';
      it('extracts app id', function () {
        expect(extractAppPathAndId(absoluteUrl).appId).to.be('appId');
      });
      it('extracts empty appPath', function () {
        expect(extractAppPathAndId(absoluteUrl).appPath).to.be('');
      });
    });
  });

  describe('from a root relative url', function () {
    describe('with a base path', function () {
      const basePath = '/gza';
      const rootRelativePath = '/gza/app/appId#appPathIsHere?query=here';
      it('extracts app path', function () {
        expect(extractAppPathAndId(rootRelativePath, basePath).appPath).to.be('appPathIsHere?query=here');
      });

      it('extracts app id', function () {
        expect(extractAppPathAndId(rootRelativePath, basePath).appId).to.be('appId');
      });

      it('returns an empty object when there is no app path', function () {
        expect(extractAppPathAndId('/gza/notformattedright', basePath)).to.be({ });
      });
    });

    describe('without a base path', function () {
      const rootRelativePath = '/app/appId#appPathIsHere?query=here';
      it('extracts app path', function () {
        expect(extractAppPathAndId(rootRelativePath).appPath).to.be('appPathIsHere?query=here');
      });

      it('extracts app id', function () {
        expect(extractAppPathAndId(rootRelativePath).appId).to.be('appId');
      });

      it('returns an empty object when there is no app path', function () {
        expect(extractAppPathAndId('/notformattedright')).to.be({ });
      });
    });

    describe('when appPath is empty', function () {
      const rootRelativePath = '/base/app/appId';
      it('extracts app id', function () {
        expect(extractAppPathAndId(rootRelativePath).appId).to.be('appId');
      });
      it('extracts empty appPath', function () {
        expect(extractAppPathAndId(rootRelativePath).appPath).to.be('');
      });
    });
  });

});
