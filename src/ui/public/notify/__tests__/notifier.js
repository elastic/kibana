import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';
import { Notifier } from 'ui/notify/notifier';

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
    notifier = new Notifier(params);
  });

  afterEach(function () {
    Notifier.prototype._notifs.length = 0;
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
      const notif = notify('error');

      expect(notif.timeRemaining).to.equal(300);
      $interval.flush(1000);
      expect(notif.timeRemaining).to.equal(299);
    });

    it('closes notification on lifetime expiry', function () {
      const expectation = sinon.mock();
      const notif = notifier.error(message, expectation);

      expectation.once();
      expectation.withExactArgs('ignore');

      $interval.flush(300000);

      expect(notif.timerId).to.be(undefined);
    });

    it('allows canceling of timer', function () {
      const notif = notify('error');

      expect(notif.timerId).to.not.be(undefined);
      notif.cancelTimer();

      expect(notif.timerId).to.be(undefined);
    });

    it('resets timer on addition to stack', function () {
      const notif = notify('error');

      $interval.flush(100000);
      expect(notif.timeRemaining).to.equal(200);

      notify('error');
      expect(notif.timeRemaining).to.equal(300);
    });

    it('allows reporting', function () {
      const includesReport = _.includes(notify('error').actions, 'report');
      expect(includesReport).to.true;
    });

    it('allows accepting', function () {
      const includesAccept = _.includes(notify('error').actions, 'accept');
      expect(includesAccept).to.true;
    });

    it('includes stack', function () {
      expect(notify('error').stack).to.be.defined;
    });

    it('has css class helper functions', function () {
      expect(notify('error').getIconClass()).to.equal('fa fa-warning');
      expect(notify('error').getButtonClass()).to.equal('kuiButton--danger');
      expect(notify('error').getAlertClassStack()).to.equal('toast-stack alert alert-danger');
      expect(notify('error').getAlertClass()).to.equal('toast alert alert-danger');
      expect(notify('error').getButtonGroupClass()).to.equal('toast-controls');
      expect(notify('error').getToastMessageClass()).to.equal('toast-message');
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
      const includesReport = _.includes(notify('warning').actions, 'report');
      expect(includesReport).to.false;
    });

    it('allows accepting', function () {
      const includesAccept = _.includes(notify('warning').actions, 'accept');
      expect(includesAccept).to.true;
    });

    it('does not include stack', function () {
      expect(notify('warning').stack).not.to.be.defined;
    });

    it('has css class helper functions', function () {
      expect(notify('warning').getIconClass()).to.equal('fa fa-warning');
      expect(notify('warning').getButtonClass()).to.equal('kuiButton--warning');
      expect(notify('warning').getAlertClassStack()).to.equal('toast-stack alert alert-warning');
      expect(notify('warning').getAlertClass()).to.equal('toast alert alert-warning');
      expect(notify('warning').getButtonGroupClass()).to.equal('toast-controls');
      expect(notify('warning').getToastMessageClass()).to.equal('toast-message');
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
      const includesReport = _.includes(notify('info').actions, 'report');
      expect(includesReport).to.false;
    });

    it('allows accepting', function () {
      const includesAccept = _.includes(notify('info').actions, 'accept');
      expect(includesAccept).to.true;
    });

    it('does not include stack', function () {
      expect(notify('info').stack).not.to.be.defined;
    });

    it('has css class helper functions', function () {
      expect(notify('info').getIconClass()).to.equal('fa fa-info-circle');
      expect(notify('info').getButtonClass()).to.equal('kuiButton--primary');
      expect(notify('info').getAlertClassStack()).to.equal('toast-stack alert alert-info');
      expect(notify('info').getAlertClass()).to.equal('toast alert alert-info');
      expect(notify('info').getButtonGroupClass()).to.equal('toast-controls');
      expect(notify('info').getToastMessageClass()).to.equal('toast-message');
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

    it('throws if second param is not an object', function () {
      // destroy the default custom notification, avoid duplicate handling
      customNotification.clear();

      function callCustomIncorrectly() {
        const badParam = null;
        customNotification = notifier.custom(customText, badParam);
      }
      expect(callCustomIncorrectly).to.throwException(function (e) {
        expect(e.message).to.be('Config param is required, and must be an object');
      });

    });

    it('has a custom function to make notifications', function () {
      expect(notifier.custom).to.be.a('function');
    });

    it('properly merges options', function () {
      // destroy the default custom notification, avoid duplicate handling
      customNotification.clear();

      const overrideParams = _.defaults({ lifetime: 20000 }, customParams);
      customNotification = notifier.custom(customText, overrideParams);

      expect(customNotification).to.have.property('type', 'info'); // default
      expect(customNotification).to.have.property('title', overrideParams.title); // passed in thru customParams
      expect(customNotification).to.have.property('lifetime', overrideParams.lifetime); // passed in thru overrideParams

      expect(overrideParams.type).to.be(undefined);
      expect(overrideParams.title).to.be.a('string');
      expect(overrideParams.lifetime).to.be.a('number');
    });

    it('sets the content', function () {
      expect(customNotification).to.have.property('content', `${params.location}: ${customText}`);
      expect(customNotification.content).to.be.a('string');
    });

    it('uses custom actions', function () {
      expect(customNotification).to.have.property('customActions');
      expect(customNotification.customActions).to.have.length(customParams.actions.length);
    });

    it('custom actions have getButtonClass method', function () {
      customNotification.customActions.forEach((action, idx) => {
        expect(action).to.have.property('getButtonClass');
        expect(action.getButtonClass).to.be.a('function');
        if (idx === 0) {
          expect(action.getButtonClass()).to.be('kuiButton--primary kuiButton--primary');
        } else {
          expect(action.getButtonClass()).to.be('kuiButton--basic kuiButton--primary');
        }
      });
    });

    it('gives a default action if none are provided', function () {
      // destroy the default custom notification, avoid duplicate handling
      customNotification.clear();

      const noActionParams = _.defaults({ actions: [] }, customParams);
      customNotification = notifier.custom(customText, noActionParams);
      expect(customNotification).to.have.property('actions');
      expect(customNotification.actions).to.have.length(1);
    });

    it('defaults type and lifetime for "info" config', function () {
      expect(customNotification.type).to.be('info');
      expect(customNotification.lifetime).to.be(5000);
    });

    it('dynamic lifetime for "banner" config', function () {
      // destroy the default custom notification, avoid duplicate handling
      customNotification.clear();

      const errorTypeParams = _.defaults({ type: 'banner' }, customParams);
      customNotification = notifier.custom(customText, errorTypeParams);
      expect(customNotification.type).to.be('banner');
      expect(customNotification.lifetime).to.be(3000000);
    });

    it('dynamic lifetime for "warning" config', function () {
      // destroy the default custom notification, avoid duplicate handling
      customNotification.clear();

      const errorTypeParams = _.defaults({ type: 'warning' }, customParams);
      customNotification = notifier.custom(customText, errorTypeParams);
      expect(customNotification.type).to.be('warning');
      expect(customNotification.lifetime).to.be(10000);
    });

    it('dynamic type and lifetime for "error" config', function () {
      // destroy the default custom notification, avoid duplicate handling
      customNotification.clear();

      const errorTypeParams = _.defaults({ type: 'error' }, customParams);
      customNotification = notifier.custom(customText, errorTypeParams);
      expect(customNotification.type).to.be('danger');
      expect(customNotification.lifetime).to.be(300000);
    });

    it('dynamic type and lifetime for "danger" config', function () {
      // destroy the default custom notification, avoid duplicate handling
      customNotification.clear();

      const errorTypeParams = _.defaults({ type: 'danger' }, customParams);
      customNotification = notifier.custom(customText, errorTypeParams);
      expect(customNotification.type).to.be('danger');
      expect(customNotification.lifetime).to.be(300000);
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
      const includesReport = _.includes(notify('banner').actions, 'report');
      expect(includesReport).to.false;
    });

    it('allows accepting', function () {
      const includesAccept = _.includes(notify('banner').actions, 'accept');
      expect(includesAccept).to.true;
    });

    it('does not include stack', function () {
      expect(notify('banner').stack).not.to.be.defined;
    });

    it('has css class helper functions', function () {
      expect(notify('banner').getIconClass()).to.equal('');
      expect(notify('banner').getButtonClass()).to.equal('kuiButton--basic');
      expect(notify('banner').getAlertClassStack()).to.equal('toast-stack alert alert-banner');
      expect(notify('banner').getAlertClass()).to.equal('alert alert-banner');
      expect(notify('banner').getButtonGroupClass()).to.equal('toast-controls-banner');
      expect(notify('banner').getToastMessageClass()).to.equal('toast-message-banner');
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
    describe('when version is configured', function () {
      it('adds version to notification', function () {
        const notification = notify(fnName);
        expect(notification.info.version).to.equal(version);
      });
    });
    describe('when build number is configured', function () {
      it('adds buildNum to notification', function () {
        const notification = notify(fnName);
        expect(notification.info.buildNum).to.equal(buildNum);
      });
    });
  }
});

describe('Directive Notification', function () {
  let notifier;
  let compile;
  let scope;

  const directiveParam = {
    template: '<h1>Hello world {{ unit.message }}</h1>',
    controllerAs: 'unit',
    controller() {
      this.message = '🎉';
    }
  };
  const customParams = {
    title: 'fooTitle',
    actions:[{
      text: 'Cancel',
      callback: sinon.spy()
    }, {
      text: 'OK',
      callback: sinon.spy()
    }]
  };
  let directiveNotification;

  beforeEach(() => {
    ngMock.module('kibana');
    ngMock.inject(function ($rootScope, $compile) {
      scope = $rootScope.$new();
      compile = $compile;
      compile;
      scope;
    });

    notifier = new Notifier({ location: 'directiveFoo' });
    directiveNotification = notifier.directive(directiveParam, customParams);
  });

  afterEach(() => {
    Notifier.prototype._notifs.length = 0;
    directiveNotification.clear();
    scope.$destroy();
  });

  describe('returns a renderable notification', () => {
    let element;

    beforeEach(() => {
      scope.notif = notifier.directive(directiveParam, customParams);
      const template = `
        <render-directive
          definition="notif.directive"
          notif="notif"
        ></render-directive>`;
      element = compile(template)(scope);
      scope.$apply();
    });

    it('that renders with the provided template', () => {
      expect(element.find('h1').text()).to.contain('Hello world');
    });

    it('that renders with the provided controller', () => {
      expect(element.text()).to.contain('🎉');
    });
  });

  it('throws if first param is not an object', () => {
    // destroy the default custom notification, avoid duplicate handling
    directiveNotification.clear();

    function callDirectiveIncorrectly() {
      const badDirectiveParam = null;
      directiveNotification = notifier.directive(badDirectiveParam, {});
    }
    expect(callDirectiveIncorrectly).to.throwException(function (e) {
      expect(e.message).to.be('Directive param is required, and must be an object');
    });
  });

  it('throws if second param is not an object', () => {
    // destroy the default custom notification, avoid duplicate handling
    directiveNotification.clear();

    function callDirectiveIncorrectly() {
      const badConfigParam = null;
      directiveNotification = notifier.directive(directiveParam, badConfigParam);
    }
    expect(callDirectiveIncorrectly).to.throwException(function (e) {
      expect(e.message).to.be('Config param is required, and must be an object');
    });
  });

  it('throws if directive param has scope definition instead of allow the helper to do its work', () => {
    // destroy the default custom notification, avoid duplicate handling
    directiveNotification.clear();

    function callDirectiveIncorrectly() {
      const badDirectiveParam = {
        scope: {
          garbage: '='
        }
      };
      directiveNotification = notifier.directive(badDirectiveParam, customParams);
    }
    expect(callDirectiveIncorrectly).to.throwException(function (e) {
      expect(e.message).to.be('Directive should not have a scope definition. Notifier has an internal implementation.');
    });
  });

  it('throws if directive param has link function instead of allow the helper to do its work', () => {
    // destroy the default custom notification, avoid duplicate handling
    directiveNotification.clear();

    function callDirectiveIncorrectly() {
      const badDirectiveParam = {
        link: ($scope) => {
          /*eslint-disable no-console*/
          console.log($scope.nothing);
          /*eslint-enable*/
        }
      };
      directiveNotification = notifier.directive(badDirectiveParam, customParams);
    }
    expect(callDirectiveIncorrectly).to.throwException(function (e) {
      expect(e.message).to.be('Directive should not have a link function. Notifier has an internal link function helper.');
    });
  });

  it('has a directive function to make notifications with template and scope', () => {
    expect(notifier.directive).to.be.a('function');
  });

  it('sets the scope property and link function', () => {
    expect(directiveNotification).to.have.property('directive');
    expect(directiveNotification.directive).to.be.an('object');

    expect(directiveNotification.directive).to.have.property('scope');
    expect(directiveNotification.directive.scope).to.be.an('object');

    expect(directiveNotification.directive).to.have.property('link');
    expect(directiveNotification.directive.link).to.be.an('function');
  });

  /* below copied from custom notification tests */
  it('uses custom actions', () => {
    expect(directiveNotification).to.have.property('customActions');
    expect(directiveNotification.customActions).to.have.length(customParams.actions.length);
  });

  it('gives a default action if none are provided', () => {
    // destroy the default custom notification, avoid duplicate handling
    directiveNotification.clear();

    const noActionParams = _.defaults({ actions: [] }, customParams);
    directiveNotification = notifier.directive(directiveParam, noActionParams);
    expect(directiveNotification).to.have.property('actions');
    expect(directiveNotification.actions).to.have.length(1);
  });

  it('defaults type and lifetime for "info" config', () => {
    expect(directiveNotification.type).to.be('info');
    expect(directiveNotification.lifetime).to.be(5000);
  });

  it('should wrap the callback functions in a close function', () => {
    directiveNotification.customActions.forEach((action, idx) => {
      expect(action.callback).not.to.equal(customParams.actions[idx]);
      action.callback();
    });
    customParams.actions.forEach(action => {
      expect(action.callback.called).to.true;
    });
  });
});
