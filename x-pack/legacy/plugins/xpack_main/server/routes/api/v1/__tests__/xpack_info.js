/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';

import { xpackInfoRoute } from '../xpack_info';

describe('XPackInfo routes', () => {
  let serverStub;
  beforeEach(() => {
    serverStub = {
      route: sinon.stub(),
      plugins: {
        xpack_main: {
          info: sinon.stub({ isAvailable() {}, toJSON() {} }),
        },
      },
    };

    xpackInfoRoute(serverStub);
  });

  it('correctly initialize XPack Info route.', () => {
    sinon.assert.calledWithExactly(serverStub.route, {
      method: 'GET',
      path: '/api/xpack/v1/info',
      handler: sinon.match.func,
    });
  });

  it('replies with `Not Found` Boom error if `xpackInfo` is not available.', () => {
    serverStub.plugins.xpack_main.info.isAvailable.returns(false);

    const onRouteHandler = serverStub.route.firstCall.args[0].handler;
    const response = onRouteHandler();

    expect(response.isBoom).to.be(true);
    expect(response.message).to.be('Not Found');
    expect(response.output.statusCode).to.be(404);
  });

  it('replies with pre-processed `xpackInfo` if it is available.', () => {
    serverStub.plugins.xpack_main.info.isAvailable.returns(true);
    serverStub.plugins.xpack_main.info.toJSON.returns({
      license: {
        type: 'gold',
        isActive: true,
        expiryDateInMillis: 1509368280381,
      },
      features: {
        security: {
          showLogin: true,
          allowLogin: true,
          showLinks: false,
          allowRoleDocumentLevelSecurity: false,
          allowRoleFieldLevelSecurity: false,
          linksMessage: 'Message',
        },
      },
    });

    const onRouteHandler = serverStub.route.firstCall.args[0].handler;
    const response = onRouteHandler();

    expect(response).to.eql({
      license: {
        type: 'gold',
        is_active: true,
        expiry_date_in_millis: 1509368280381,
      },
      features: {
        security: {
          show_login: true,
          allow_login: true,
          show_links: false,
          allow_role_document_level_security: false,
          allow_role_field_level_security: false,
          links_message: 'Message',
        },
      },
    });
  });
});
