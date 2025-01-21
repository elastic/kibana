/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityGetRoleMappingResponse } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import type {
  DeprecationsDetails,
  DocLinksServiceSetup,
  ElasticsearchClient,
  GetDeprecationsContext,
} from '@kbn/core/server';
import { ReportingCore } from '..';
import { deprecations } from '../lib/deprecations';

const REPORTING_USER_ROLE_NAME = 'reporting_user';
const getDocumentationUrl = (branch: string) => {
  // TODO: remove when docs support "main"
  const docBranch = branch === 'main' ? 'master' : branch;
  return `https://www.elastic.co/guide/en/kibana/${docBranch}/kibana-privileges.html`;
};

interface ExtraDependencies {
  reportingCore: ReportingCore;
}

export async function getDeprecationsInfo(
  { esClient }: GetDeprecationsContext,
  { reportingCore }: ExtraDependencies
): Promise<DeprecationsDetails[]> {
  const client = esClient.asCurrentUser;
  const { security, docLinks } = reportingCore.getPluginSetupDeps();

  // Nothing to do if security is disabled
  if (!security?.license.isEnabled()) {
    return [];
  }

  const config = reportingCore.getConfig();
  const deprecatedRoles = config.roles.allow || ['reporting_user'];

  return await getRoleMappingsDeprecations(client, reportingCore, deprecatedRoles, docLinks);
}

async function getRoleMappingsDeprecations(
  client: ElasticsearchClient,
  reportingCore: ReportingCore,
  deprecatedRoles: string[],
  docLinks: DocLinksServiceSetup
): Promise<DeprecationsDetails[]> {
  const usingDeprecatedConfig = !reportingCore.getContract().usesUiCapabilities();
  const strings = {
    title: i18n.translate('xpack.reporting.deprecations.reportingRoleMappings.title', {
      defaultMessage: `The "{reportingUserRoleName}" role is deprecated: check role mappings`,
      values: { reportingUserRoleName: REPORTING_USER_ROLE_NAME },
    }),
    message: i18n.translate('xpack.reporting.deprecations.reportingRoleMappings.description', {
      defaultMessage:
        `The default mechanism for Reporting privileges will work differently in future versions, and` +
        ` this cluster has role mappings that are mapped to a deprecated role for this privilege.` +
        ` Set "xpack.reporting.roles.enabled" to "false" to adopt the future behavior before upgrading.`,
    }),
    manualSteps: (roleMappings: string) => [
      ...(usingDeprecatedConfig
        ? [
            i18n.translate('xpack.reporting.deprecations.reportingRoleMappings.manualStepOne', {
              defaultMessage: `Set "xpack.reporting.roles.enabled" to "false" in kibana.yml.`,
            }),
            i18n.translate('xpack.reporting.deprecations.reportingRoleMappings.manualStepTwo', {
              defaultMessage: `Remove "xpack.reporting.roles.allow" in kibana.yml, if present.`,
            }),
          ]
        : []),

      i18n.translate('xpack.reporting.deprecations.reportingRoleMappings.manualStepThree', {
        defaultMessage:
          `Go to Management > Security > Roles to create one or more roles that grant` +
          ` the Kibana application privilege for Reporting.`,
      }),
      i18n.translate('xpack.reporting.deprecations.reportingRoleMappings.manualStepFour', {
        defaultMessage: `Grant Reporting privileges to users by assigning one of the new roles.`,
      }),
      i18n.translate('xpack.reporting.deprecations.reportingRoleMappings.manualStepFive', {
        defaultMessage:
          `Remove the "reporting_user" role from all role mappings and add the custom role.` +
          ` The affected role mappings are: {roleMappings}.`,
        values: { roleMappings },
      }),
    ],
  };

  let roleMappings: SecurityGetRoleMappingResponse;
  try {
    roleMappings = await client.security.getRoleMapping();
  } catch (err) {
    const { logger } = reportingCore.getPluginSetupDeps();
    if (deprecations.getErrorStatusCode(err) === 403) {
      logger.warn(
        `Failed to retrieve role mappings when checking for deprecations:` +
          ` the "manage_security" cluster privilege is required.`
      );
    } else {
      logger.error(
        `Failed to retrieve role mappings when checking for deprecations,` +
          ` unexpected error: ${deprecations.getDetailedErrorMessage(err)}.`
      );
    }
    return deprecations.deprecationError(strings.title, err, docLinks);
  }

  const roleMappingsWithReportingRole: string[] = Object.entries(roleMappings).reduce(
    (roleSet, current) => {
      const [roleName, role] = current;
      const foundMapping = role.roles?.find((roll) => deprecatedRoles.includes(roll));
      if (foundMapping) {
        roleSet.push(`${roleName}[${foundMapping}]`);
      }
      return roleSet;
    },
    [] as string[]
  );

  if (roleMappingsWithReportingRole.length === 0) {
    return [];
  }

  return [
    {
      title: strings.title,
      message: strings.message,
      correctiveActions: {
        manualSteps: strings.manualSteps(roleMappingsWithReportingRole.join(', ')),
      },
      level: 'warning',
      deprecationType: 'feature',
      documentationUrl: getDocumentationUrl(reportingCore.getKibanaPackageInfo().branch),
    },
  ];
}
