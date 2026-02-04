/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { isValidNamespace } from '../../services';
import { MAX_REUSABLE_AGENT_POLICIES_PER_PACKAGE_POLICY } from '../../constants/package_policy';

export const PackagePolicyNamespaceSchema = schema.string({
  validate: (value) => {
    const namespaceValidation = isValidNamespace(value || '', true);
    if (!namespaceValidation.valid && namespaceValidation.error) {
      return namespaceValidation.error;
    }
  },
  meta: {
    description:
      "The package policy namespace. Leave blank to inherit the agent policy's namespace.",
  },
});

export const ConfigRecordSchema = schema.recordOf(
  schema.string(),
  schema.object({
    type: schema.maybe(schema.string()),
    value: schema.maybe(schema.any()),
    frozen: schema.maybe(schema.boolean()),
  }),
  {
    meta: {
      description: 'Package variable (see integration documentation for more information)',
    },
  }
);

export const VarGroupSelectionsSchema = schema.maybe(
  schema.recordOf(schema.string(), schema.string(), {
    meta: {
      description:
        'Variable group selections. Maps var_group name to the selected option name within that group.',
    },
  })
);

const PackagePolicyStreamsSchema = {
  id: schema.maybe(schema.string()), // BWC < 7.11
  enabled: schema.boolean(),
  keep_enabled: schema.maybe(schema.boolean()),
  release: schema.maybe(
    schema.oneOf([schema.literal('ga'), schema.literal('beta'), schema.literal('experimental')])
  ),
  data_stream: schema.object({
    dataset: schema.string(),
    type: schema.string(),
    elasticsearch: schema.maybe(
      schema.object({
        privileges: schema.maybe(
          schema.object({
            indices: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
          })
        ),
        dynamic_dataset: schema.maybe(schema.boolean()),
        dynamic_namespace: schema.maybe(schema.boolean()),
      })
    ),
  }),
  vars: schema.maybe(ConfigRecordSchema),
  var_group_selections: VarGroupSelectionsSchema,
  config: schema.maybe(ConfigRecordSchema),
  compiled_stream: schema.maybe(schema.any()),
};

export const PackagePolicyInputsSchema = {
  id: schema.maybe(schema.string()),
  type: schema.string(),
  policy_template: schema.maybe(schema.string()),
  enabled: schema.boolean(),
  keep_enabled: schema.maybe(schema.boolean()),
  vars: schema.maybe(ConfigRecordSchema),
  config: schema.maybe(ConfigRecordSchema),
  streams: schema.arrayOf(schema.object(PackagePolicyStreamsSchema), { maxSize: 100 }),
};

export const ExperimentalDataStreamFeaturesSchema = schema.arrayOf(
  schema.object({
    data_stream: schema.string(),
    features: schema.object({
      synthetic_source: schema.maybe(schema.boolean({ defaultValue: false })),
      tsdb: schema.maybe(schema.boolean({ defaultValue: false })),
      doc_value_only_numeric: schema.maybe(schema.boolean({ defaultValue: false })),
      doc_value_only_other: schema.maybe(schema.boolean({ defaultValue: false })),
    }),
  }),
  { maxSize: 100 }
);

export const PackagePolicyPackageSchema = schema.object({
  name: schema.string({
    meta: {
      description: 'Package name',
    },
  }),
  title: schema.maybe(schema.string()),
  version: schema.string({
    meta: {
      description: 'Package version',
    },
  }),
  experimental_data_stream_features: schema.maybe(ExperimentalDataStreamFeaturesSchema),
  requires_root: schema.maybe(schema.boolean()),
  fips_compatible: schema.maybe(schema.boolean()),
});

export const PackagePolicyBaseSchema = {
  name: schema.string({
    meta: {
      description: 'Unique name for the package policy.',
    },
  }),
  description: schema.maybe(
    schema.string({
      meta: {
        description: 'Package policy description',
      },
    })
  ),
  namespace: schema.maybe(PackagePolicyNamespaceSchema),
  policy_id: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.string({
        meta: {
          description: 'ID of the agent policy which the package policy will be added to.',
          deprecated: true,
        },
      }),
    ])
  ),
  policy_ids: schema.maybe(
    schema.arrayOf(
      schema.string({
        meta: {
          description: 'IDs of the agent policies which that package policy will be added to.',
        },
      }),
      {
        maxSize: MAX_REUSABLE_AGENT_POLICIES_PER_PACKAGE_POLICY,
      }
    )
  ),
  output_id: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  cloud_connector_id: schema.maybe(
    schema.nullable(
      schema.string({
        meta: {
          description: 'ID of the cloud connector associated with this package policy.',
        },
      })
    )
  ),
  cloud_connector_name: schema.maybe(
    schema.nullable(
      schema.string({
        minLength: 1,
        maxLength: 255,
        meta: {
          description: 'Transient field for cloud connector name during creation.',
        },
      })
    )
  ),
  enabled: schema.boolean(),
  is_managed: schema.maybe(schema.boolean()),
  package: schema.maybe(PackagePolicyPackageSchema),

  inputs: schema.arrayOf(schema.object(PackagePolicyInputsSchema), { maxSize: 1000 }),
  vars: schema.maybe(ConfigRecordSchema),
  var_group_selections: VarGroupSelectionsSchema,
  overrides: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.object(
        {
          inputs: schema.maybe(
            schema.recordOf(schema.string(), schema.any(), {
              validate: (val) => {
                if (
                  Object.keys(val).some(
                    (key) =>
                      key.match(/^compiled_inputs(\.)?/) || key.match(/^compiled_stream(\.)?/)
                  )
                ) {
                  return 'Overrides of compiled_inputs and compiled_stream are not allowed';
                }
              },
            })
          ),
        },
        {
          meta: {
            description:
              'Override settings that are defined in the package policy. The override option should be used only in unusual circumstances and not as a routine procedure.',
          },
        }
      ),
    ])
  ),
  supports_agentless: schema.maybe(
    schema.nullable(
      schema.boolean({
        defaultValue: false,
        meta: {
          description: 'Indicates whether the package policy belongs to an agentless agent policy.',
        },
      })
    )
  ),
  supports_cloud_connector: schema.maybe(
    schema.nullable(
      schema.boolean({
        defaultValue: false,
        meta: {
          description: 'Indicates whether the package policy supports cloud connectors.',
        },
      })
    )
  ),
  additional_datastreams_permissions: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.arrayOf(schema.string(), {
        validate: validateAdditionalDatastreamsPermissions,
        meta: {
          description: 'Additional datastream permissions, that will be added to the agent policy.',
        },
        maxSize: 1000,
      }),
    ])
  ),
};

export const NewPackagePolicySchema = schema.object({
  ...PackagePolicyBaseSchema,
  id: schema.maybe(schema.string()),
  force: schema.maybe(schema.boolean()),
});

const CreatePackagePolicyProps = {
  ...PackagePolicyBaseSchema,
  enabled: schema.maybe(schema.boolean()),
  package: schema.maybe(PackagePolicyPackageSchema),
  inputs: schema.arrayOf(
    schema.object({
      ...PackagePolicyInputsSchema,
      streams: schema.maybe(
        schema.arrayOf(schema.object(PackagePolicyStreamsSchema), { maxSize: 100 })
      ),
    }),
    { maxSize: 1000 }
  ),
  spaceIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
};

export const CreatePackagePolicyRequestBodySchema = schema.object({
  ...CreatePackagePolicyProps,
  id: schema.maybe(
    schema.string({
      meta: {
        description: 'Package policy unique identifier',
      },
    })
  ),
  force: schema.maybe(
    schema.boolean({
      meta: {
        description:
          'Force package policy creation even if the package is not verified, or if the agent policy is managed.',
      },
    })
  ),
  // supports_agentless is deprecated for package policy creation in favor of agentless policies API
  supports_agentless: schema.maybe(
    schema.nullable(
      schema.boolean({
        defaultValue: false,
        meta: {
          description:
            'Indicates whether the package policy belongs to an agentless agent policy. Deprecated in favor of the Fleet agentless policies API.',
          deprecated: true,
        },
      })
    )
  ),
});

export const SimplifiedVarsSchema = schema.recordOf(
  schema.string(),
  schema.nullable(
    schema.oneOf([
      schema.boolean(),
      schema.string(),
      schema.number(),
      schema.arrayOf(schema.string(), { maxSize: 100 }),
      schema.arrayOf(schema.number(), { maxSize: 100 }),
      // Secrets
      schema.object({
        id: schema.string(),
        isSecretRef: schema.boolean(),
      }),
    ])
  ),
  {
    meta: {
      description:
        'Input/stream level variable. Refer to the integration documentation for more information.',
    },
  }
);

export const SimplifiedPackagePolicyInputsSchema = schema.maybe(
  schema.recordOf(
    schema.string(),
    schema.object({
      enabled: schema.maybe(
        schema.boolean({
          meta: {
            description: 'Enable or disable that input. Defaults to `true` (enabled).',
          },
        })
      ),
      vars: schema.maybe(SimplifiedVarsSchema),
      streams: schema.maybe(
        schema.recordOf(
          schema.string(),
          schema.object({
            enabled: schema.maybe(
              schema.boolean({
                meta: {
                  description: 'Enable or disable that stream. Defaults to `true` (enabled).',
                },
              })
            ),
            vars: schema.maybe(SimplifiedVarsSchema),
            var_group_selections: VarGroupSelectionsSchema,
          }),
          {
            meta: {
              description:
                'Input streams. Refer to the integration documentation to know which streams are available.',
            },
          }
        )
      ),
    }),
    {
      meta: {
        description:
          'Package policy inputs. Refer to the integration documentation to know which inputs are available.',
      },
    }
  )
);

const VALIDATE_DATASTREAMS_PERMISSION_REGEX =
  /^(logs)|(metrics)|(traces)|(synthetics)|(profiling)-(.*)$/;

function validateAdditionalDatastreamsPermissions(values: string[]) {
  for (const val of values) {
    if (!val.match(VALIDATE_DATASTREAMS_PERMISSION_REGEX)) {
      return `${val} is not a valid datastream permissions, it should match logs|metrics|traces|synthetics|profiling)-*`;
    }
  }
}

export const SimplifiedPackagePolicyBaseSchema = schema.object({
  id: schema.maybe(
    schema.string({
      meta: {
        description: 'Policy unique identifier.',
      },
    })
  ),
  name: schema.string({
    meta: {
      description: 'Unique name for the policy.',
    },
  }),
  description: schema.maybe(
    schema.string({
      meta: {
        description: 'Policy description.',
      },
    })
  ),
  namespace: schema.maybe(
    schema.string({
      meta: {
        description:
          'Policy namespace. When not specified, it inherits the agent policy namespace.',
      },
    })
  ),
  output_id: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  vars: schema.maybe(SimplifiedVarsSchema),
  var_group_selections: VarGroupSelectionsSchema,
  inputs: SimplifiedPackagePolicyInputsSchema,
  supports_agentless: schema.maybe(
    schema.nullable(
      schema.boolean({
        defaultValue: false,
        meta: {
          description: 'Indicates whether the package policy belongs to an agentless agent policy.',
        },
      })
    )
  ),
  additional_datastreams_permissions: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.arrayOf(schema.string(), {
        validate: validateAdditionalDatastreamsPermissions,
        meta: {
          description: 'Additional datastream permissions, that will be added to the agent policy.',
        },
        maxSize: 100,
      }),
    ])
  ),
});

export const SimplifiedPackagePolicyPreconfiguredSchema = SimplifiedPackagePolicyBaseSchema.extends(
  {
    id: schema.string(),
    package: schema.object({
      name: schema.string(),
    }),
  }
);

export const SimplifiedCreatePackagePolicyRequestBodySchema =
  SimplifiedPackagePolicyBaseSchema.extends({
    policy_id: schema.maybe(
      schema.oneOf([schema.literal(null), schema.string()], {
        meta: {
          description: 'Deprecated. Use policy_ids instead.',
          deprecated: true,
        },
      })
    ),
    policy_ids: schema.maybe(
      schema.arrayOf(schema.string(), {
        meta: {
          description: 'IDs of the agent policies which that package policy will be added to.',
        },
        maxSize: MAX_REUSABLE_AGENT_POLICIES_PER_PACKAGE_POLICY,
      })
    ),
    force: schema.maybe(
      schema.boolean({
        meta: {
          description:
            'Force package policy creation even if the package is not verified, or if the agent policy is managed.',
        },
      })
    ),
    package: PackagePolicyPackageSchema,
    // supports_agentless is deprecated for package policy creation in favor of agentless policies API
    supports_agentless: schema.maybe(
      schema.nullable(
        schema.boolean({
          defaultValue: false,
          meta: {
            description:
              'Indicates whether the package policy belongs to an agentless agent policy. Deprecated in favor of the Fleet agentless policies API.',
            deprecated: true,
          },
        })
      )
    ),
  });

export const UpdatePackagePolicyRequestBodySchema = schema.object({
  ...CreatePackagePolicyProps,
  name: schema.maybe(schema.string()),
  inputs: schema.maybe(
    schema.arrayOf(
      schema.object({
        ...PackagePolicyInputsSchema,
        streams: schema.maybe(
          schema.arrayOf(schema.object(PackagePolicyStreamsSchema), { maxSize: 100 })
        ),
      }),
      { maxSize: 100 }
    )
  ),
  version: schema.maybe(schema.string()),
  force: schema.maybe(schema.boolean()),
});

export const UpdatePackagePolicySchema = schema.object({
  ...PackagePolicyBaseSchema,
  version: schema.maybe(schema.string()),
});

export const PackagePolicySchema = schema.object({
  ...PackagePolicyBaseSchema,
  id: schema.string({
    meta: {
      description: 'Package policy unique identifier.',
    },
  }),
  version: schema.maybe(
    schema.string({
      meta: {
        description: 'Package policy ES version.',
      },
    })
  ),
  revision: schema.number({
    meta: {
      description: 'Package policy revision.',
    },
  }),
  updated_at: schema.string(),
  updated_by: schema.string(),
  created_at: schema.string(),
  created_by: schema.string(),
  elasticsearch: schema
    .maybe(
      schema.object({
        privileges: schema.maybe(
          schema.object({
            cluster: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
          })
        ),
      })
    )
    .extendsDeep({
      unknowns: 'allow',
    }),
  inputs: schema.arrayOf(
    schema.object({
      ...PackagePolicyInputsSchema,
      compiled_input: schema.maybe(schema.any()),
    }),
    { maxSize: 100 }
  ),
  secret_references: schema.maybe(
    schema.arrayOf(
      schema.object({
        id: schema.string(),
      }),
      { maxSize: 100 }
    )
  ),
});

export const PackagePolicyResponseSchema = PackagePolicySchema.extends({
  vars: schema.maybe(
    schema.oneOf([ConfigRecordSchema, schema.maybe(SimplifiedVarsSchema)], {
      meta: {
        description: 'Package level variable.',
      },
    })
  ),
  inputs: schema.oneOf(
    [
      schema.arrayOf(
        schema.object({
          ...PackagePolicyInputsSchema,
          compiled_input: schema.maybe(schema.any()),
        }),
        { maxSize: 100 }
      ),
      SimplifiedPackagePolicyInputsSchema,
    ],
    {
      meta: {
        description: 'Package policy inputs.',
      },
    }
  ),
  spaceIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
  agents: schema.maybe(schema.number()),
});

export const OrphanedPackagePoliciesResponseSchema = schema.object({
  items: schema.arrayOf(PackagePolicyResponseSchema, { maxSize: 10000 }),
  total: schema.number(),
});

export const DryRunPackagePolicySchema = PackagePolicySchema.extends(
  {
    id: schema.maybe(schema.string()),
    force: schema.maybe(schema.boolean()),
    revision: schema.maybe(schema.number()),
    updated_at: schema.maybe(schema.string()),
    updated_by: schema.maybe(schema.string()),
    created_at: schema.maybe(schema.string()),
    created_by: schema.maybe(schema.string()),
    errors: schema.maybe(
      schema.arrayOf(
        schema.object({
          message: schema.string(),
          key: schema.maybe(schema.string()),
        }),
        { maxSize: 10 }
      )
    ),
    missingVars: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
  },
  {
    unknowns: 'allow',
  }
);

export const PackagePolicyStatusResponseSchema = schema.object({
  id: schema.string(),
  success: schema.boolean(),
  name: schema.maybe(schema.string()),
  statusCode: schema.maybe(schema.number()),
  body: schema.maybe(schema.object({ message: schema.string() })),
});
