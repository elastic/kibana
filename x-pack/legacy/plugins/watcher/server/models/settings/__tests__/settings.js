/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Settings } from '../settings';

describe('settings module', () => {
  describe('Settings class', () => {
    describe('fromUpstreamJson factory method', () => {
      describe('when no upstream JSON is specified', () => {
        it('returns the correct Settings instance', () => {
          const settings = Settings.fromUpstreamJson();

          const actionTypes = settings.actionTypes;
          expect(actionTypes.email.enabled).to.be(false);
          expect(actionTypes.webhook.enabled).to.be(true);
          expect(actionTypes.index.enabled).to.be(true);
          expect(actionTypes.logging.enabled).to.be(true);
          expect(actionTypes.slack.enabled).to.be(false);
          expect(actionTypes.jira.enabled).to.be(false);
          expect(actionTypes.pagerduty.enabled).to.be(false);
        });
      });

      describe('when upstream JSON contains a configured action type', () => {
        it('returns the correct Settings instance', () => {
          const upstreamJson = {
            persistent: {
              xpack: {
                notification: {
                  email: {
                    account: {
                      foo: {},
                      bar: {}
                    },
                    default_account: 'bar'
                  }
                }
              }
            },
            defaults: {
              xpack: {
                notification: {
                  email: {
                    account: {
                      scooby: {},
                      scrappy: {}
                    },
                    default_account: 'scooby'
                  }
                }
              }
            }
          };
          const settings = Settings.fromUpstreamJson(upstreamJson);

          const actionTypes = settings.actionTypes;
          expect(actionTypes.email.enabled).to.be(true);
          expect(actionTypes.email.accounts.scooby.default).to.be(true);
          expect(actionTypes.email.accounts.scrappy).to.be.an('object');
          expect(actionTypes.email.accounts.foo).to.be.an('object');
          expect(actionTypes.email.accounts.bar).to.be.an('object');
        });
      });
    });

    describe('downstreamJson getter method', () => {
      it('returns correct JSON for client', () => {
        const upstreamJson = {
          defaults: {
            xpack: {
              notification: {
                email: {
                  account: {
                    scooby: {},
                    scrappy: {}
                  },
                  default_account: 'scooby'
                }
              }
            }
          }
        };
        const settings = Settings.fromUpstreamJson(upstreamJson);
        const json = settings.downstreamJson;

        expect(json.action_types.email.enabled).to.be(true);
        expect(json.action_types.email.accounts.scooby.default).to.be(true);
        expect(json.action_types.email.accounts.scrappy).to.be.an('object');
        expect(json.action_types.webhook.enabled).to.be(true);
        expect(json.action_types.index.enabled).to.be(true);
        expect(json.action_types.logging.enabled).to.be(true);
        expect(json.action_types.slack.enabled).to.be(false);
        expect(json.action_types.jira.enabled).to.be(false);
        expect(json.action_types.pagerduty.enabled).to.be(false);
      });
    });
  });
});
