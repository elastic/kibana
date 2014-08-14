/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



define(function (require) {
  'use strict';
  var $ = require("jquery");
  var PhoneHome = require('common/PhoneHome');

  describe('common/PhoneHome.js', function() {
    describe('Object Model', function() {

      var phoneHome, client;

      beforeEach(function () {
        client = { delete: sinon.stub(), put: sinon.stub(), post: sinon.stub(), get: sinon.stub() };
        phoneHome = new PhoneHome({
          client: client,
          baseUrl: 'http://localhost:9200',
          index: '.marvel-kibana'
        });
      });

      describe('set()', function() {
        it('should set a single value', function() {
          phoneHome.set('test', '123');
          expect(phoneHome.attributes).to.have.property('test', '123');
        });

        it('should bulk set using an object', function() {
          phoneHome.set({ 'key1': 'value1', 'key2': 'value2' });
          expect(phoneHome.attributes).to.have.property('key1', 'value1');
          expect(phoneHome.attributes).to.have.property('key2', 'value2');
        });

        it('should fire a change event on set', function(done) {
          phoneHome.on('change:key1', function (value) {
            expect(value).to.equal('value1');
            done();
          }); 
          phoneHome.set('key1', 'value1');
        });

        it('should fire a change event on bulk set for each', function(done) {
          var count = 0;
          var checkIfDone = function () {
            count++;
            if (count === 2) {
              done();
            }
          };
          phoneHome.on('change:key1', function (value) {
            expect(value).to.equal('value1');
            checkIfDone();
          }); 
          phoneHome.on('change:key1', function (value) {
            expect(value).to.equal('value1');
            checkIfDone();
          }); 
          phoneHome.set({ 'key1': 'value1', 'key2': 'value2' });
        });

        it('should set the old value for the change event for single set', function (done) {
          phoneHome.set('key1', 'value0');
          phoneHome.on('change:key1', function (newVal, oldVal) {
            expect(oldVal).to.equal('value0'); 
            expect(newVal).to.equal('value1'); 
            done();
          });
          setTimeout(function () {
            phoneHome.set('key1', 'value1');
          }, 0);
        });

        it('should set the old value for the change event for bulk set', function (done) {
          phoneHome.set('key1', 'value0');
          phoneHome.on('change:key1', function (newVal, oldVal) {
            expect(oldVal).to.equal('value0'); 
            expect(newVal).to.equal('value1'); 
            done();
          });
          setTimeout(function () {
            phoneHome.set({ 'key1': 'value1' });
          }, 0);
        });
        
      });

      describe('get()', function() {

        it('should return a value when get is called', function() {
          phoneHome.set('key1', 'value1');
          expect(phoneHome.get('key1')).to.equal('value1');
        });

        it('should return a hash when get is called without a key', function() {
          phoneHome.set('key1', 'value1');
          phoneHome.set('key2', 'value2');
          expect(phoneHome.get()).to.have.property('key1', 'value1');
          expect(phoneHome.get()).to.have.property('key2', 'value2');
        });
        
      });

      describe('save functions', function() {
        it('should save only fieldsToBrowser fields to the localStore', function () {
          var data = {
            trialTimestamp: 1,
            report: true,
            status: 'test',
            foo: true
          };
          phoneHome.set(data); 
          phoneHome.saveToBrowser();
          expect(localStorage.getItem('marvelOpts')).to.equal(JSON.stringify({ trialTimestamp: 1, report: true, status: 'test' }));
        });

        it('should save only fieldsToES fields to the Elasticsearch', function () {
          var data = {
            registrationData: 'test',
            report: true,
            status: 'purchased',
            trialTimestamp: 1 
          };
          phoneHome.set(data); 
          phoneHome.saveToES();
          sinon.assert.calledOnce(client.put);
          expect(client.put.args[0][0]).to.equal('http://localhost:9200/.marvel-kibana/appdata/marvelOpts');
          expect(client.put.args[0][1]).to.have.property('status', 'purchased');
          expect(client.put.args[0][1]).to.have.property('registrationData', 'test');
          expect(client.put.args[0][1]).to.have.property('report', true);
          expect(client.put.args[0][1]).to.not.have.property('trialTimestamp');
        });
      });

      describe('misc functions', function() {
        it('should delete everyting when destory is called', function() {
          var lsRemoveStub = sinon.stub(localStorage, 'removeItem'); 
          phoneHome.destroy();
          sinon.assert.calledOnce(lsRemoveStub);
          sinon.assert.calledOnce(client.delete);
          sinon.assert.calledWith(client.delete, 'http://localhost:9200/.marvel-kibana/appdata/marvelOpts');
          lsRemoveStub.restore(); 
        });
        
        it('should set the baseUrl', function() {
          phoneHome.setBaseUrl('http://foo');
          expect(phoneHome).to.have.property('baseUrl', 'http://foo');
        });

        it('should set trialTimestamp', function() {
          var saveToBrowserStub = sinon.stub(phoneHome, 'saveToBrowser');
          phoneHome.setTrialTimestamp(1);
          expect(phoneHome.get('trialTimestamp')).to.equal(1);
          sinon.assert.calledOnce(saveToBrowserStub);
        });
      });

    });

    describe('Phone Home Features', function() {
      var phoneHome, client;

      beforeEach(function () {
        client = { delete: sinon.stub(), put: sinon.stub(), post: sinon.stub(), get: sinon.stub() };
        phoneHome = new PhoneHome({
          client: client,
          baseUrl: 'http://localhost:9200',
          index: '.marvel-kibana'
        });
      });

      describe('change:data events', function() {
        it('should call sendIfDue()', function(done) {
          var sendIfDueStub = sinon.stub(phoneHome, 'sendIfDue');
          phoneHome.on('change:data', function  () {
            sinon.assert.calledOnce(sendIfDueStub);
            expect(sendIfDueStub.args[0][0]).to.have.property('key1', 'value1');
            sendIfDueStub.restore();
            done();
          });
          phoneHome.set('data', { 'key1': 'value1' });
        }); 

        it('should call checkAndSendRegistrationData()', function(done) {
          var checkStub = sinon.stub(phoneHome, 'checkAndSendRegistrationData');
          phoneHome.on('change:data', function () {
            sinon.assert.calledOnce(checkStub);
            checkStub.restore();
            done();
          });
          phoneHome.set('data', {});
        }); 
      });

      describe('checkReportStatus()', function() {
        it('should return true if lastReport is NOT set', function() {
          phoneHome.set({
            version: '1.0',
            report: true
          });
          expect(phoneHome.checkReportStatus()).to.equal(true);
        }); 

        it('should return true if url changed', function() {
          phoneHome.setBaseUrl('http://search-01:4080');
          phoneHome.set({
            version: '1.0',
            lastReport: new Date().getTime(),
            report: true
          });
          expect(phoneHome.checkReportStatus()).to.equal(true);
        }); 
        
        it('should return true if lastReport is older then a day', function() {
          phoneHome.set({
            version: '1.0',
            lastReport: new Date().getTime()-86400001,
            report: true
          });
          expect(phoneHome.checkReportStatus()).to.equal(true);
        }); 

        it('should return false if lastReport is NOT older then a day', function() {
          phoneHome.set({
            version: '1.0',
            lastReport: new Date().getTime()-3600,
            report: true
          });
          expect(phoneHome.checkReportStatus()).to.equal(false);
        }); 
      });


      describe('checkRegistratonStatus()', function() {
        it('should return true if registered is false and trialTimestamp is older then 7 days', function() {
          phoneHome.set({
            status: 'trial',
            trialTimestamp: new Date().getTime()-(86400000*7.25)
          });
          expect(phoneHome.checkRegistratonStatus()).to.equal(true);
        });

        it('should return false if registered is true and trialTimestamp is older then 7 days', function() {
          phoneHome.set({
            status: 'registered',
            trialTimestamp: new Date().getTime()-(86400000*7.25)
          });
          expect(phoneHome.checkRegistratonStatus()).to.equal(false);
        });

        it('should return false if purchased is true and trialTimestamp is older then 7 days', function() {
          phoneHome.set({
            status: 'purchased',
            trialTimestamp: new Date().getTime()-(86400000*7.25)
          });
          expect(phoneHome.checkRegistratonStatus()).to.equal(false);
        });
      });


      describe('sendIfDue()', function() {
        it('should post to registration url when sendIfDue() is due', function() {
          var promise = $.Deferred();
          var checkStub = sinon.stub(phoneHome, 'checkReportStatus');
          checkStub.onFirstCall().returns(true);
          client.post.onFirstCall().returns(promise);
          phoneHome.sendIfDue({ key1: 'value1' }); 
          sinon.assert.calledOnce(client.post);
          expect(client.post.args[0][0]).to.equal(phoneHome.getStatsReportUrl());
          expect(client.post.args[0][1]).to.have.property('key1', 'value1');
        });

        it('should set lastReport  when sendIfDue() is due', function(done) {
          var promise = $.Deferred();
          var checkStub = sinon.stub(phoneHome, 'checkReportStatus');
          checkStub.onFirstCall().returns(true);
          client.post.onFirstCall().returns(promise);
          phoneHome.sendIfDue({ key1: 'value1' }).then(function () {
            expect(phoneHome.get('lastReport')).to.be.greaterThan(1);
            done();
          }); 
          promise.resolve({});
        });

        it('should call saveToBrowser() when sendIfDue() is due', function(done) {
          var promise = $.Deferred();
          var checkStub = sinon.stub(phoneHome, 'checkReportStatus');
          var saveToBrowserStub = sinon.stub(phoneHome, 'saveToBrowser');
          checkStub.onFirstCall().returns(true);
          client.post.onFirstCall().returns(promise);
          phoneHome.sendIfDue({ key1: 'value1' }).then(function () {
            sinon.assert.calledOnce(saveToBrowserStub);
            saveToBrowserStub.restore();
            done();
          }); 
          promise.resolve({});
        });
      });

      describe('register()', function() {
        it('should call saveToBrowser() and saveToES()', function() {
          var saveToBrowserStub = sinon.stub(phoneHome, 'saveToBrowser'); 
          var saveToESStub = sinon.stub(phoneHome, 'saveToES');
          phoneHome.register({ key1: 'value1' });
          sinon.assert.calledOnce(saveToBrowserStub);
          sinon.assert.calledOnce(saveToESStub);
        });

        it('should set registrationData', function() {
          phoneHome.register({ key1: 'value1' });
          expect(phoneHome.get('registrationData')).to.have.property('key1', 'value1');
        });

        it('should set status to registered', function() {
          phoneHome.register({ key1: 'value1' });
          expect(phoneHome.get('status')).to.equal('registered');
        });
      });

      describe('confirmPurchase()', function() {
        it('should call saveToBrowser() and saveToES()', function() {
          var saveToBrowserStub = sinon.stub(phoneHome, 'saveToBrowser'); 
          var saveToESStub = sinon.stub(phoneHome, 'saveToES');
          phoneHome.confirmPurchase({ key1: 'value1' });
          sinon.assert.calledOnce(saveToBrowserStub);
          sinon.assert.calledOnce(saveToESStub);
        });

        it('should set registrationData', function() {
          phoneHome.confirmPurchase({ key1: 'value1' });
          expect(phoneHome.get('registrationData')).to.have.property('key1', 'value1');
        });

        it('should set purchased to true', function() {
          phoneHome.confirmPurchase({ key1: 'value1' });
          expect(phoneHome.get('status')).to.equal('purchased');
        });
      });

      describe('checkAndSendRegistrationData()', function() {

        beforeEach(function() {
          phoneHome.attributes = {
            registrationData: { key1: 'value1' },
            registrationSent: false,
            data: {
              uuid: 123456789
            }
          }; 
        });

        afterEach(function () {
          client.post.reset(); 
        });

        it('should not send registration if registrationSent is true', function () {
          phoneHome.set('registrationSent', true);
          phoneHome.checkAndSendRegistrationData();   
          sinon.assert.notCalled(client.post);
        });

        it('should not send registration if data.uuid is not set', function () {
          delete phoneHome.attributes.data.uuid;
          phoneHome.checkAndSendRegistrationData();   
          sinon.assert.notCalled(client.post);
        });

        it('should not send registration if registrationData is not set', function () {
          delete phoneHome.attributes.registrationData;
          phoneHome.checkAndSendRegistrationData();   
          sinon.assert.notCalled(client.post);
        });

        it('should send registration to the right url', function() {
          var promise = $.Deferred();
          client.post.returns(promise);
          phoneHome.checkAndSendRegistrationData();
          expect(client.post.args[0][0]).to.equal(phoneHome.getRegistrationUrl());
          promise.resolve(true);
        });

        it('should send purchase information to the right url', function() {
          var promise = $.Deferred();
          client.post.returns(promise);
          phoneHome.set('status', 'purchased');
          phoneHome.checkAndSendRegistrationData();
          expect(client.post.args[0][0]).to.equal(phoneHome.getPurchaseConfirmationUrl());
          promise.resolve(true);
        });

        it('should set the uuid for registrationData', function() {
          var promise = $.Deferred();
          client.post.returns(promise);
          phoneHome.checkAndSendRegistrationData();   
          sinon.assert.calledOnce(client.post);
          expect(client.post.args[0][1]).to.have.property('uuid', 123456789);
        }); 

        it('should set the values for registrationData', function() {
          var promise = $.Deferred();
          client.post.returns(promise);
          phoneHome.checkAndSendRegistrationData();   
          sinon.assert.calledOnce(client.post);
          expect(client.post.args[0][1]).to.have.property('key1', 'value1');
        }); 

        it('should set registrationSent to true', function() {
          var promise = $.Deferred();
          client.post.returns(promise);
          phoneHome.checkAndSendRegistrationData();   
          promise.resolve({});
          sinon.assert.calledOnce(client.post);
          expect(phoneHome.get('registrationSent')).to.equal(true);
        }); 

        it('should call saveToBrowser() upon successful submission', function() {
          var promise = $.Deferred();
          var saveToBrowserStub = sinon.stub(phoneHome, 'saveToBrowser');
          client.post.returns(promise);
          phoneHome.checkAndSendRegistrationData();   
          promise.resolve(true);
          sinon.assert.calledOnce(saveToBrowserStub);
        });
      });
      
      describe('fetch()', function() {

        var promise, lsGetItemStub;

        beforeEach(function() {
          promise = $.Deferred();
          lsGetItemStub = sinon.stub(localStorage, 'getItem');
          client.get.returns(promise);
        });

        afterEach(function () {
          lsGetItemStub.restore();
          client.get.reset();
        });

        it('should set values stored from the browser', function(done) {
          lsGetItemStub.returns('{ "key1": "value1" }');
          phoneHome.fetch().then(function () {
            expect(phoneHome.get('key1')).to.equal('value1');
            done();
          });
          promise.resolve({ data: { _source: {} } });
        });        

        it('should set values stored in Elasticsearch', function(done) {
          lsGetItemStub.returns('{}');
          phoneHome.fetch().then(function () {
            expect(phoneHome.get('key2')).to.equal('value2');
            done();  
          });
          promise.resolve({ data: { _source: { key2: 'value2' } } });
        });        

      });

    });
  });  
});
