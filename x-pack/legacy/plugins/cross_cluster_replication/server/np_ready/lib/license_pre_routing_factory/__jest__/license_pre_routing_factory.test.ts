/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { kibanaResponseFactory } from '../../../../../../../../../src/core/server';
import { licensePreRoutingFactory } from '../license_pre_routing_factory';

describe('license_pre_routing_factory', () => {
  describe('#reportingFeaturePreRoutingFactory', () => {
    let mockDeps: any;
    let mockLicenseCheckResults: any;

    const anyContext: any = {};
    const anyRequest: any = {};

    beforeEach(() => {
      mockDeps = {
        __LEGACY: {
          server: {
            plugins: {
              xpack_main: {
                info: {
                  feature: () => ({
                    getLicenseCheckResults: () => mockLicenseCheckResults,
                  }),
                },
              },
            },
          },
        },
        requestHandler: jest.fn(),
      };
    });

    describe('isAvailable is false', () => {
      beforeEach(() => {
        mockLicenseCheckResults = {
          isAvailable: false,
        };
      });

      it('replies with 403', async () => {
        const licensePreRouting = licensePreRoutingFactory(mockDeps);
        const response = await licensePreRouting(anyContext, anyRequest, kibanaResponseFactory);
        expect(response.status).toBe(403);
      });
    });

    describe('isAvailable is true', () => {
      beforeEach(() => {
        mockLicenseCheckResults = {
          isAvailable: true,
        };
      });

      it('it calls the wrapped handler', async () => {
        const licensePreRouting = licensePreRoutingFactory(mockDeps);
        await licensePreRouting(anyContext, anyRequest, kibanaResponseFactory);
        expect(mockDeps.requestHandler).toHaveBeenCalledTimes(1);
      });
    });
  });
});
