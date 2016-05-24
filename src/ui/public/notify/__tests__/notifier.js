import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';
import Notifier from 'ui/notify/notifier';

describe('Notifier', function () {
  let $interval;
  let message = 'Oh, the humanity!';
  let notifier;
  let params;
  let version = window.__KBN__.version;
  let buildNum = window.__KBN__.buildNum;

  beforeEach(function () {
    ngMock.module('kibana');

    ngMock.inject(function (_$interval_) {
      $interval = _$interval_;
    });
  });

  beforeEach(function () {
    params = { location: 'foo' };
    while (Notifier.prototype._notifs.pop()); // clear global notifications
    notifier = new Notifier(params);
  });

  describe('#constructor()', function () {
    it('sets #from from given location', function () {
      expect(notifier.from).to.equal(params.location);
    });
  });

  describe('#error', function () {
    testVersionInfo('error');

    it('prepends location to message for content', function () {
      expect(notify('error').content).to.equal(params.location + ': ' + message);
    });

    it('sets type to "danger"', function () {
      expect(notify('error').type).to.equal('danger');
    });

    it('sets icon to "warning"', function () {
      expect(notify('error').icon).to.equal('warning');
    });

    it('sets title to "Error"', function () {
      expect(notify('error').title).to.equal('Error');
    });

    it('sets lifetime to 5 minutes', function () {
      expect(notify('error').lifetime).to.equal(300000);
    });

    it('sets timeRemaining and decrements', function () {
      let notif = notify('error');

      expect(notif.timeRemaining).to.equal(300);
      $interval.flush(1000);
      expect(notif.timeRemaining).to.equal(299);
    });

    it('closes notification on lifetime expiry', function () {
      let expectation = sinon.mock();
      let notif = notifier.error(message, expectation);

      expectation.once();
      expectation.withExactArgs('ignore');

      $interval.flush(300000);

      expect(notif.timerId).to.be(undefined);
    });

    it('allows canceling of timer', function () {
      let notif = notify('error');

      expect(notif.timerId).to.not.be(undefined);
      notif.cancelTimer();

      expect(notif.timerId).to.be(undefined);
    });

    it('resets timer on addition to stack', function () {
      let notif = notify('error');

      $interval.flush(100000);
      expect(notif.timeRemaining).to.equal(200);

      notify('error');
      expect(notif.timeRemaining).to.equal(300);
    });

    it('allows reporting', function () {
      let includesReport = _.includes(notify('error').actions, 'report');
      expect(includesReport).to.true;
    });

    it('allows accepting', function () {
      let includesAccept = _.includes(notify('error').actions, 'accept');
      expect(includesAccept).to.true;
    });

    it('includes stack', function () {
      expect(notify('error').stack).to.be.defined;
    });
  });

  describe('#warning', function () {
    testVersionInfo('warning');

    it('prepends location to message for content', function () {
      expect(notify('warning').content).to.equal(params.location + ': ' + message);
    });

    it('sets type to "warning"', function () {
      expect(notify('warning').type).to.equal('warning');
    });

    it('sets icon to "warning"', function () {
      expect(notify('warning').icon).to.equal('warning');
    });

    it('sets title to "Warning"', function () {
      expect(notify('warning').title).to.equal('Warning');
    });

    it('sets lifetime to 10000', function () {
      expect(notify('warning').lifetime).to.equal(10000);
    });

    it('does not allow reporting', function () {
      let includesReport = _.includes(notify('warning').actions, 'report');
      expect(includesReport).to.false;
    });

    it('allows accepting', function () {
      let includesAccept = _.includes(notify('warning').actions, 'accept');
      expect(includesAccept).to.true;
    });

    it('does not include stack', function () {
      expect(notify('warning').stack).not.to.be.defined;
    });
  });

  describe('#info', function () {
    testVersionInfo('info');

    it('prepends location to message for content', function () {
      expect(notify('info').content).to.equal(params.location + ': ' + message);
    });

    it('sets type to "info"', function () {
      expect(notify('info').type).to.equal('info');
    });

    it('sets icon to "info-circle"', function () {
      expect(notify('info').icon).to.equal('info-circle');
    });

    it('sets title to "Debug"', function () {
      expect(notify('info').title).to.equal('Debug');
    });

    it('sets lifetime to 5000', function () {
      expect(notify('info').lifetime).to.equal(5000);
    });

    it('does not allow reporting', function () {
      let includesReport = _.includes(notify('info').actions, 'report');
      expect(includesReport).to.false;
    });

    it('allows accepting', function () {
      let includesAccept = _.includes(notify('info').actions, 'accept');
      expect(includesAccept).to.true;
    });

    it('does not include stack', function () {
      expect(notify('info').stack).not.to.be.defined;
    });
  });

  describe('#banner', function () {
    testVersionInfo('banner');

    it('has no content', function () {
      expect(notify('banner').content).not.to.be.defined;
    });

    it('prepends location to message for markdown', function () {
      expect(notify('banner').markdown).to.equal(params.location + ': ' + message);
    });

    it('sets type to "banner"', function () {
      expect(notify('banner').type).to.equal('banner');
    });

    it('sets icon to undefined', function () {
      expect(notify('banner').icon).to.equal(undefined);
    });

    it('sets title to "Attention"', function () {
      expect(notify('banner').title).to.equal('Attention');
    });

    it('sets lifetime to 3000000 by default', function () {
      expect(notify('banner').lifetime).to.equal(3000000);
    });

    it('does not allow reporting', function () {
      let includesReport = _.includes(notify('banner').actions, 'report');
      expect(includesReport).to.false;
    });

    it('allows accepting', function () {
      let includesAccept = _.includes(notify('banner').actions, 'accept');
      expect(includesAccept).to.true;
    });

    it('does not include stack', function () {
      expect(notify('banner').stack).not.to.be.defined;
    });
  });

  function notify(fnName) {
    notifier[fnName](message);
    return latestNotification();
  }

  function latestNotification() {
    return _.last(notifier._notifs);
  }

  function testVersionInfo(fnName) {
    context('when version is configured', function () {
      it('adds version to notification', function () {
        let notification = notify(fnName);
        expect(notification.info.version).to.equal(version);
      });
    });
    context('when build number is configured', function () {
      it('adds buildNum to notification', function () {
        let notification = notify(fnName);
        expect(notification.info.buildNum).to.equal(buildNum);
      });
    });
  }
});
