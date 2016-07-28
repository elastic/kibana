import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';
import Notifier from 'ui/notify/notifier';

describe('Notifier', function () {
  let $interval;
  let notifier;
  let params;
  const version = window.__KBN__.version;
  const buildNum = window.__KBN__.buildNum;
  const message = 'Oh, the humanity!';
  const customText = 'fooMarkup';
  const customParams = {
    title: 'fooTitle',
    lifetime: 10000,
    actions:[{
      text: 'Cancel',
      callback: sinon.spy()
    }, {
      text: 'OK',
      callback: sinon.spy()
    }]
  };

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

  describe('#custom', function () {
    let customNotification;

    beforeEach(() => {
      customNotification = notifier.custom(customText, customParams);
    });

    afterEach(() => {
      customNotification.clear();
    });

    it('has a custom function to make notifications', function () {
      expect(notifier.custom).to.be.a('function');
    });

    it('properly merges options', function () {
      expect(customNotification).to.have.property('title', customParams.title);
      expect(customNotification).to.have.property('lifetime', customParams.lifetime);

      expect(customParams.title).to.be.a('string');
      expect(customParams.lifetime).to.be.a('number');
    });

    it('sets the content', function () {
      expect(customNotification).to.have.property('content', `${params.location}: ${customText}`);
      expect(customNotification.content).to.be.a('string');
    });

    it('uses custom actions', function () {
      expect(customNotification).to.have.property('customActions');
      expect(customNotification.customActions).to.have.length(customParams.actions.length);
    });

    it('gives a default action if none are provided', function () {
      // destroy the default custom notification, avoid duplicate handling
      customNotification.clear();

      const noActionParams = _.defaults({ actions: [] }, customParams);
      customNotification = notifier.custom(customText, noActionParams);
      expect(customNotification).to.have.property('actions');
      expect(customNotification.actions).to.have.length(1);
    });

    it('should wrap the callback functions in a close function', function () {
      customNotification.customActions.forEach((action, idx) => {
        expect(action.callback).not.to.equal(customParams.actions[idx]);
        action.callback();
      });
      customParams.actions.forEach(action => {
        expect(action.callback.called).to.true;
      });
    });
  });

  describe('#banner', function () {
    testVersionInfo('banner');

    it('has no content', function () {
      expect(notify('banner').content).not.to.be.defined;
    });

    it('prepends location to message for markdown', function () {
      expect(notify('banner').content).to.equal(`${params.location}: ${message}`);
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
