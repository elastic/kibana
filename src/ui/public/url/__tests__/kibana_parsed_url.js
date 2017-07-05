import expect from 'expect.js';

import { KibanaParsedUrl } from '../kibana_parsed_url';

describe('KibanaParsedUrl', function () {
  it('getHashedAppPath', function () {
    const kibanaParsedUrl = new KibanaParsedUrl({
      basePath: '/hi',
      appId: 'bye',
      appPath: 'visualize?hi=there&bye'
    });
    expect(kibanaParsedUrl.getHashedAppPath()).to.be('#visualize?hi=there&bye');
  });

  it('getAppRootPath', function () {
    const kibanaParsedUrl = new KibanaParsedUrl({
      basePath: '/hi',
      appId: 'appId',
      appPath: 'dashboard?edit=123'
    });
    expect(kibanaParsedUrl.getAppRootPath()).to.be('/app/appId#dashboard?edit=123');
  });

  describe('when basePath is specified', function () {
    it('getRootRelativePath', function () {
      const kibanaParsedUrl = new KibanaParsedUrl({
        basePath: '/base',
        appId: 'appId',
        appPath: 'visualize?hi=there&bye'
      });
      expect(kibanaParsedUrl.getRootRelativePath()).to.be('/base/app/appId#visualize?hi=there&bye');
    });

    describe('getAbsolutePath', function () {
      const protocol = 'http';
      const hostname = 'www.test.com';
      const port = '5601';

      it('returns the absolute url when there is a port', function () {
        const kibanaParsedUrl = new KibanaParsedUrl({
          basePath: '/base',
          appId: 'appId',
          appPath: 'visualize?hi=there&bye',
          hostname,
          protocol,
          port,
        });
        expect(kibanaParsedUrl.getAbsoluteUrl()).to.be(
          'http://www.test.com:5601/base/app/appId#visualize?hi=there&bye');
      });

      it('returns the absolute url when there are no query parameters', function () {
        const kibanaParsedUrl = new KibanaParsedUrl({
          basePath: '/base',
          appId: 'appId',
          appPath: 'visualize',
          hostname,
          protocol,
        });
        expect(kibanaParsedUrl.getAbsoluteUrl()).to.be(
          'http://www.test.com/base/app/appId#visualize');
      });

      it('returns the absolute url when the are query parameters', function () {
        const kibanaParsedUrl = new KibanaParsedUrl({
          basePath: '/base',
          appId: 'appId',
          appPath: 'visualize?hi=bye&tata',
          hostname,
          protocol,
        });
        expect(kibanaParsedUrl.getAbsoluteUrl()).to.be(
          'http://www.test.com/base/app/appId#visualize?hi=bye&tata');
      });
    });
  });

  describe('when basePath is not specified', function () {
    it('getRootRelativePath', function () {
      const kibanaParsedUrl = new KibanaParsedUrl({
        appId: 'appId',
        appPath: 'visualize?hi=there&bye'
      });
      expect(kibanaParsedUrl.getRootRelativePath()).to.be('/app/appId#visualize?hi=there&bye');
    });

    describe('getAbsolutePath', function () {
      const protocol = 'http';
      const hostname = 'www.test.com';
      const port = '5601';

      it('returns the absolute url when there is a port', function () {
        const kibanaParsedUrl = new KibanaParsedUrl({
          appId: 'appId',
          appPath: 'visualize?hi=there&bye',
          hostname,
          protocol,
          port
        });
        expect(kibanaParsedUrl.getAbsoluteUrl()).to.be(
          'http://www.test.com:5601/app/appId#visualize?hi=there&bye');
      });

      it('returns the absolute url when there are no query parameters', function () {
        const kibanaParsedUrl = new KibanaParsedUrl({
          appId: 'appId',
          appPath: 'visualize',
          hostname,
          protocol,
        });
        expect(kibanaParsedUrl.getAbsoluteUrl()).to.be('http://www.test.com/app/appId#visualize');
      });

      it('returns the absolute url when there are query parameters', function () {
        const kibanaParsedUrl = new KibanaParsedUrl({
          appId: 'appId',
          appPath: 'visualize?hi=bye&tata',
          hostname,
          protocol,
        });
        expect(kibanaParsedUrl.getAbsoluteUrl()).to.be('http://www.test.com/app/appId#visualize?hi=bye&tata');
      });
    });
  });

  describe('getGlobalState', function () {
    const basePath = '/xyz';
    const appId = 'myApp';

    it('returns an empty string when the KibanaParsedUrl is in an invalid state', function () {
      const url = new KibanaParsedUrl({ basePath });
      expect(url.getGlobalState()).to.be('');
    });

    it('returns an empty string when there is no global state', function () {
      const url = new KibanaParsedUrl({ basePath, appId, appPath: '/hi?notg=something' });
      expect(url.getGlobalState()).to.be('');
    });

    it('returns the global state when it is the last parameter', function () {
      const url = new KibanaParsedUrl({ basePath, appId, appPath: '/hi?notg=something&_g=(thisismyglobalstate)' });
      expect(url.getGlobalState()).to.be('(thisismyglobalstate)');
    });

    it('returns the global state when it is the first parameter', function () {
      const url = new KibanaParsedUrl({ basePath, appId, appPath: '/hi?_g=(thisismyglobalstate)&hi=bye' });
      expect(url.getGlobalState()).to.be('(thisismyglobalstate)');
    });
  });

  describe('setGlobalState', function () {
    const basePath = '/xyz';
    const appId = 'myApp';

    it('does nothing when KibanaParsedUrl is in an invalid state', function () {
      const url = new KibanaParsedUrl({ basePath });
      url.setGlobalState('newglobalstate');
      expect(url.getGlobalState()).to.be('');
    });

    it('clears the global state when setting it to an empty string', function () {
      const url = new KibanaParsedUrl({ basePath, appId, appPath: '/hi?_g=globalstate' });
      url.setGlobalState('');
      expect(url.getGlobalState()).to.be('');
    });

    it('updates the global state when a string is passed in', function () {
      const url = new KibanaParsedUrl({ basePath, appId, appPath: '/hi?notg=something&_g=oldstate' });
      url.setGlobalState('newstate');
      expect(url.getGlobalState()).to.be('newstate');
    });

    it('adds the global state parameters if it did not exist before', function () {
      const url = new KibanaParsedUrl({ basePath, appId, appPath: '/hi' });
      url.setGlobalState('newstate');
      expect(url.getGlobalState()).to.be('newstate');
      expect(url.appPath).to.be('/hi?_g=newstate');
    });
  });
});
