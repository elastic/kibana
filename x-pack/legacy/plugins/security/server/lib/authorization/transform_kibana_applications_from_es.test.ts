/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsApplication } from './types';
import { PrivilegeSerializer } from './privilege_serializer';
import { ResourceSerializer } from './resource_serializer';
import { transformKibanaApplicationsFromEs } from './transform_kibana_applications_from_es';
import { RESERVED_PRIVILEGES_APPLICATION_WILDCARD } from '../../../common/constants';

const application = 'kibana-.kibana';

describe('transformKibanaApplicationsFromEs', () => {
  it('throws for empty resources', () => {
    const esApplications: EsApplication[] = [
      {
        application,
        privileges: [PrivilegeSerializer.serializeGlobalBasePrivilege('all')],
        resources: [],
      },
    ];

    expect(() =>
      transformKibanaApplicationsFromEs(application, esApplications)
    ).toThrowErrorMatchingInlineSnapshot(
      `"ES returned an application entry without resources, can't process this"`
    );
  });

  it('does not transform unknown applications', () => {
    const esApplications: EsApplication[] = [
      {
        application: 'kibana-.unknown',
        privileges: [PrivilegeSerializer.serializeGlobalBasePrivilege('all')],
        resources: [ResourceSerializer.serializeSpaceResource('my-space')],
      },
      {
        application: 'other-.unknown',
        privileges: [PrivilegeSerializer.serializeGlobalBasePrivilege('all')],
        resources: [ResourceSerializer.serializeSpaceResource('my-space')],
      },
    ];

    expect(transformKibanaApplicationsFromEs(application, esApplications)).toEqual({
      success: true,
      value: [],
    });
  });

  it('transforms well-formed entries', () => {
    const esApplications: EsApplication[] = [
      {
        application,
        privileges: [PrivilegeSerializer.serializeGlobalBasePrivilege('all')],
        resources: ['*'],
      },
      {
        application,
        privileges: [
          PrivilegeSerializer.serializeFeaturePrivilege('feature1', 'all'),
          PrivilegeSerializer.serializeFeaturePrivilege('feature2', 'read'),
        ],
        resources: [ResourceSerializer.serializeSpaceResource('my-space')],
      },
      {
        application,
        privileges: [PrivilegeSerializer.serializeSpaceBasePrivilege('all')],
        resources: [ResourceSerializer.serializeSpaceResource('my-space')],
      },
    ];

    expect(transformKibanaApplicationsFromEs(application, esApplications)).toEqual({
      success: true,
      value: [
        {
          base: ['all'],
          feature: {},
          spaces: ['*'],
        },
        {
          base: [],
          feature: {
            feature1: ['all'],
            feature2: ['read'],
          },
          spaces: ['my-space'],
        },
        {
          base: ['all'],
          feature: {},
          spaces: ['my-space'],
        },
      ],
    });
  });

  it(`returns 'success: false' when global base privileges are assigned at a space`, () => {
    const esApplications: EsApplication[] = [
      {
        application,
        privileges: [PrivilegeSerializer.serializeGlobalBasePrivilege('all')],
        resources: [ResourceSerializer.serializeSpaceResource('my-space')],
      },
    ];

    expect(transformKibanaApplicationsFromEs(application, esApplications)).toEqual({
      success: false,
    });
  });

  it(`returns 'success: false' when reserved privileges are assigned at a space`, () => {
    const esApplications: EsApplication[] = [
      {
        application,
        privileges: [PrivilegeSerializer.serializeReservedPrivilege('all')],
        resources: [ResourceSerializer.serializeSpaceResource('my-space')],
      },
    ];

    expect(transformKibanaApplicationsFromEs(application, esApplications)).toEqual({
      success: false,
    });
  });

  it(`returns 'success: false' when reserved privileges are assigned with other privileges`, () => {
    const esApplications: EsApplication[] = [
      {
        application,
        privileges: [
          PrivilegeSerializer.serializeReservedPrivilege('all'),
          PrivilegeSerializer.serializeGlobalBasePrivilege('all'),
        ],
        resources: ['*'],
      },
    ];

    expect(transformKibanaApplicationsFromEs(application, esApplications)).toEqual({
      success: false,
    });
  });

  it(`returns 'success: false' when both base and feature privileges are assigned globally in the same application entry`, () => {
    const esApplications: EsApplication[] = [
      {
        application,
        privileges: [
          PrivilegeSerializer.serializeGlobalBasePrivilege('all'),
          PrivilegeSerializer.serializeFeaturePrivilege('feature-1', 'all'),
        ],
        resources: ['*'],
      },
    ];

    expect(transformKibanaApplicationsFromEs(application, esApplications)).toEqual({
      success: false,
    });
  });

  it(`returns 'success: false' when both base and feature privileges are assigned at a space in the same application entry`, () => {
    const esApplications: EsApplication[] = [
      {
        application,
        privileges: [
          PrivilegeSerializer.serializeSpaceBasePrivilege('all'),
          PrivilegeSerializer.serializeFeaturePrivilege('feature-1', 'all'),
        ],
        resources: [ResourceSerializer.serializeSpaceResource('my-space')],
      },
    ];

    expect(transformKibanaApplicationsFromEs(application, esApplications)).toEqual({
      success: false,
    });
  });

  it(`returns 'success: false' when space base privileges are assigned globally`, () => {
    const esApplications: EsApplication[] = [
      {
        application,
        privileges: [PrivilegeSerializer.serializeSpaceBasePrivilege('all')],
        resources: ['*'],
      },
    ];

    expect(transformKibanaApplicationsFromEs(application, esApplications)).toEqual({
      success: false,
    });
  });

  it(`returns 'success: false' when privileges are assigned at both the global and other resources`, () => {
    const esApplications: EsApplication[] = [
      {
        application,
        privileges: [PrivilegeSerializer.serializeFeaturePrivilege('feature-1', 'all')],
        resources: ['*', ResourceSerializer.serializeSpaceResource('my-space')],
      },
    ];

    expect(transformKibanaApplicationsFromEs(application, esApplications)).toEqual({
      success: false,
    });
  });

  it(`returns 'success: false' for malformed resources`, () => {
    const esApplications: EsApplication[] = [
      {
        application,
        privileges: [PrivilegeSerializer.serializeFeaturePrivilege('feature-1', 'all')],
        resources: ['i-dont-know-what-i-am'],
      },
    ];

    expect(transformKibanaApplicationsFromEs(application, esApplications)).toEqual({
      success: false,
    });
  });

  describe('reserved privileges application wildcard', () => {
    it('transforms reserved privileges', () => {
      const esApplications: EsApplication[] = [
        {
          application: RESERVED_PRIVILEGES_APPLICATION_WILDCARD,
          privileges: [PrivilegeSerializer.serializeReservedPrivilege('all')],
          resources: ['*'],
        },
      ];

      expect(transformKibanaApplicationsFromEs(application, esApplications)).toEqual({
        success: true,
        value: [
          {
            base: [],
            feature: {},
            _reserved: ['all'],
            spaces: ['*'],
          },
        ],
      });
    });

    it(`returns 'success: false' for non-reserved privileges`, () => {
      const esApplications: EsApplication[] = [
        {
          application: RESERVED_PRIVILEGES_APPLICATION_WILDCARD,
          privileges: [PrivilegeSerializer.serializeGlobalBasePrivilege('all')],
          resources: ['*'],
        },
      ];

      expect(transformKibanaApplicationsFromEs(application, esApplications)).toEqual({
        success: false,
      });
    });

    it(`returns 'success: false' for reserved privileges at a specific resource`, () => {
      const esApplications: EsApplication[] = [
        {
          application: RESERVED_PRIVILEGES_APPLICATION_WILDCARD,
          privileges: [PrivilegeSerializer.serializeGlobalBasePrivilege('all')],
          resources: [ResourceSerializer.serializeSpaceResource('some-space')],
        },
      ];

      expect(transformKibanaApplicationsFromEs(application, esApplications)).toEqual({
        success: false,
      });
    });
  });
});
