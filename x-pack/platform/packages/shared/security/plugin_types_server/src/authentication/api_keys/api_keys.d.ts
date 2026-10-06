/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { getKibanaRoleSchema } from '../../authorization';
export declare const restApiKeySchema: import('@kbn/config-schema').ObjectType<{
  type: import('@kbn/config-schema').Type<'rest' | undefined>;
  name: import('@kbn/config-schema').Type<string>;
  expiration: import('@kbn/config-schema').Type<string | undefined>;
  role_descriptors: import('@kbn/config-schema').Type<Record<string, Readonly<{} & {}>>>;
  metadata: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
}>;
export declare const getRestApiKeyWithKibanaPrivilegesSchema: (
  getBasePrivilegeNames: Parameters<typeof getKibanaRoleSchema>[0]
) => import('@kbn/config-schema').ObjectType<{
  type: import('@kbn/config-schema').Type<'rest' | undefined>;
  name: import('@kbn/config-schema').Type<string>;
  expiration: import('@kbn/config-schema').Type<string | undefined>;
  metadata: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
  kibana_role_descriptors: import('@kbn/config-schema').Type<
    Record<
      string,
      Readonly<
        {} & {
          elasticsearch: Readonly<
            {
              cluster?: string[] | undefined;
              remote_cluster?:
                | Readonly<
                    {} & {
                      privileges: string[];
                      clusters: string[];
                    }
                  >[]
                | undefined;
              indices?:
                | Readonly<
                    {
                      field_security?: Record<'except' | 'grant', string[]> | undefined;
                      query?: string | undefined;
                      allow_restricted_indices?: boolean | undefined;
                    } & {
                      names: string[];
                      privileges: string[];
                    }
                  >[]
                | undefined;
              remote_indices?:
                | Readonly<
                    {
                      field_security?: Record<'except' | 'grant', string[]> | undefined;
                      query?: string | undefined;
                      allow_restricted_indices?: boolean | undefined;
                    } & {
                      clusters: string[];
                      names: string[];
                      privileges: string[];
                    }
                  >[]
                | undefined;
              run_as?: string[] | undefined;
              global?:
                | Readonly<
                    {
                      application?:
                        | Readonly<
                            {
                              manage?:
                                | Readonly<
                                    {} & {
                                      applications: string[];
                                    }
                                  >
                                | undefined;
                            } & {}
                          >
                        | undefined;
                      profile?:
                        | Readonly<
                            {
                              write?:
                                | Readonly<
                                    {} & {
                                      applications: string[];
                                    }
                                  >
                                | undefined;
                            } & {}
                          >
                        | undefined;
                      role?: Readonly<{} & {}> | undefined;
                      data_source?:
                        | Readonly<
                            {} & {
                              names: string[];
                              privileges: (
                                | 'create'
                                | 'delete'
                                | 'manage'
                                | 'read'
                                | 'read_metadata'
                              )[];
                            }
                          >[]
                        | undefined;
                    } & {}
                  >
                | undefined;
            } & {}
          >;
          kibana: Readonly<
            {
              base?: string[] | undefined;
              feature?: Record<string, string[]> | undefined;
            } & {
              spaces: string[] | '*'[];
            }
          >[];
        }
      >
    >
  >;
}>;
export declare const crossClusterApiKeySchema: import('@kbn/config-schema').ObjectType<{
  type: import('@kbn/config-schema').Type<'cross_cluster'>;
  name: import('@kbn/config-schema').Type<string>;
  expiration: import('@kbn/config-schema').Type<string | undefined>;
  metadata: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
  certificate_identity: import('@kbn/config-schema').Type<string | undefined>;
  access: import('@kbn/config-schema').ObjectType<{
    search: import('@kbn/config-schema').Type<
      | Readonly<
          {
            query?: any;
            field_security?: any;
            allow_restricted_indices?: boolean | undefined;
          } & {
            names: string[];
          }
        >[]
      | undefined
    >;
    replication: import('@kbn/config-schema').Type<
      | Readonly<
          {
            allow_restricted_indices?: boolean | undefined;
          } & {
            names: string[];
          }
        >[]
      | undefined
    >;
  }>;
}>;
export declare const updateRestApiKeySchema: import('@kbn/config-schema').ObjectType<{
  id: import('@kbn/config-schema').Type<string>;
  type: import('@kbn/config-schema').Type<'rest' | undefined>;
  expiration: import('@kbn/config-schema').Type<string | undefined>;
  role_descriptors: import('@kbn/config-schema').Type<Record<string, Readonly<{} & {}>>>;
  metadata: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
}>;
export declare const updateCrossClusterApiKeySchema: import('@kbn/config-schema').ObjectType<{
  id: import('@kbn/config-schema').Type<string>;
  type: import('@kbn/config-schema').Type<'cross_cluster'>;
  expiration: import('@kbn/config-schema').Type<string | undefined>;
  metadata: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
  certificate_identity: import('@kbn/config-schema').Type<string | null | undefined>;
  access: import('@kbn/config-schema').ObjectType<{
    search: import('@kbn/config-schema').Type<
      | Readonly<
          {
            query?: any;
            field_security?: any;
            allow_restricted_indices?: boolean | undefined;
          } & {
            names: string[];
          }
        >[]
      | undefined
    >;
    replication: import('@kbn/config-schema').Type<
      | Readonly<
          {
            allow_restricted_indices?: boolean | undefined;
          } & {
            names: string[];
          }
        >[]
      | undefined
    >;
  }>;
}>;
export declare const getUpdateRestApiKeyWithKibanaPrivilegesSchema: (
  getBasePrivilegeNames: Parameters<typeof getKibanaRoleSchema>[0]
) => import('@kbn/config-schema').ObjectType<{
  type: import('@kbn/config-schema').Type<'rest' | undefined>;
  expiration: import('@kbn/config-schema').Type<string | undefined>;
  metadata: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
  id: import('@kbn/config-schema').Type<string>;
  kibana_role_descriptors: import('@kbn/config-schema').Type<
    Record<
      string,
      Readonly<
        {} & {
          elasticsearch: Readonly<
            {
              cluster?: string[] | undefined;
              remote_cluster?:
                | Readonly<
                    {} & {
                      privileges: string[];
                      clusters: string[];
                    }
                  >[]
                | undefined;
              indices?:
                | Readonly<
                    {
                      field_security?: Record<'except' | 'grant', string[]> | undefined;
                      query?: string | undefined;
                      allow_restricted_indices?: boolean | undefined;
                    } & {
                      names: string[];
                      privileges: string[];
                    }
                  >[]
                | undefined;
              remote_indices?:
                | Readonly<
                    {
                      field_security?: Record<'except' | 'grant', string[]> | undefined;
                      query?: string | undefined;
                      allow_restricted_indices?: boolean | undefined;
                    } & {
                      clusters: string[];
                      names: string[];
                      privileges: string[];
                    }
                  >[]
                | undefined;
              run_as?: string[] | undefined;
              global?:
                | Readonly<
                    {
                      application?:
                        | Readonly<
                            {
                              manage?:
                                | Readonly<
                                    {} & {
                                      applications: string[];
                                    }
                                  >
                                | undefined;
                            } & {}
                          >
                        | undefined;
                      profile?:
                        | Readonly<
                            {
                              write?:
                                | Readonly<
                                    {} & {
                                      applications: string[];
                                    }
                                  >
                                | undefined;
                            } & {}
                          >
                        | undefined;
                      role?: Readonly<{} & {}> | undefined;
                      data_source?:
                        | Readonly<
                            {} & {
                              names: string[];
                              privileges: (
                                | 'create'
                                | 'delete'
                                | 'manage'
                                | 'read'
                                | 'read_metadata'
                              )[];
                            }
                          >[]
                        | undefined;
                    } & {}
                  >
                | undefined;
            } & {}
          >;
          kibana: Readonly<
            {
              base?: string[] | undefined;
              feature?: Record<string, string[]> | undefined;
            } & {
              spaces: string[] | '*'[];
            }
          >[];
        }
      >
    >
  >;
}>;
