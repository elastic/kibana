/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer, EuiLink, EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { getNormalizedInputs } from '../../../../../../../../common/services';
import { doesPackageHaveIntegrations } from '../../../../../../../../common/services/packages_with_integrations';
import { useLink } from '../../../../../../../hooks';
import type { PackageInfo, RegistryPolicyTemplate } from '../../../../../types';

export const DeprecationCallout: React.FC<{
  packageInfo: PackageInfo;
  integrationInfo?: RegistryPolicyTemplate;
}> = ({ packageInfo, integrationInfo }) => {
  const { getHref } = useLink();
  const hasIntegrations = doesPackageHaveIntegrations(packageInfo);
  const deprecated =
    packageInfo?.conditions?.deprecated ||
    packageInfo?.deprecated ||
    (hasIntegrations && integrationInfo?.deprecated ? integrationInfo.deprecated : undefined);

  return (
    <>
      {' '}
      {deprecated ? (
        <>
          <EuiCallOut
            announceOnMount
            data-test-subj="deprecationCallout"
            title={i18n.translate('xpack.fleet.epm.deprecatedIntegrationTitle', {
              defaultMessage: 'This integration is deprecated',
            })}
            color="warning"
            iconType="warning"
          >
            <p>{deprecated?.description}</p>
            {deprecated?.since && (
              <p>
                <FormattedMessage
                  id="xpack.fleet.epm.deprecatedSinceVersion"
                  defaultMessage="Deprecated since version {version}"
                  values={{ version: deprecated?.since }}
                />
              </p>
            )}
            {deprecated?.replaced_by?.package && (
              <p>
                <FormattedMessage
                  id="xpack.fleet.epm.replacedByPackage"
                  defaultMessage="Use {link} instead."
                  values={{
                    link: (
                      <EuiLink
                        href={getHref('integration_details_overview', {
                          pkgkey: deprecated.replaced_by.package,
                        })}
                      >
                        {deprecated.replaced_by.package}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            )}
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      ) : null}
    </>
  );
};

export const DeprecatedFeaturesCallout: React.FC<{ packageInfo: PackageInfo }> = ({
  packageInfo,
}) => {
  interface DeprecatedFeature {
    type: 'input' | 'variable' | 'data stream' | 'policy template';
    name: string;
    description: string;
  }

  const hasIntegrations = doesPackageHaveIntegrations(packageInfo);

  const deprecatedVars = (
    vars: Array<{ deprecated?: { description: string }; title?: string; name: string }>
  ) =>
    vars
      .filter((v): v is typeof v & { deprecated: { description: string } } => !!v.deprecated)
      .map(
        (v): DeprecatedFeature => ({
          type: 'variable',
          name: v.title || v.name,
          description: v.deprecated.description,
        })
      );

  const deprecatedPolicyTemplateFeatures = hasIntegrations
    ? []
    : (packageInfo.policy_templates || [])
        .filter((pt) => !!pt.deprecated)
        .map(
          (pt): DeprecatedFeature => ({
            type: 'policy template',
            name: pt.title,
            description: pt.deprecated!.description,
          })
        );

  const deprecatedInputFeatures = (packageInfo.policy_templates || []).flatMap((policyTemplate) => {
    const inputs = getNormalizedInputs(policyTemplate);
    return inputs.flatMap((input): DeprecatedFeature[] => [
      ...(input.deprecated
        ? [
            {
              type: 'input' as const,
              name: input.title || input.type,
              description: input.deprecated.description,
            },
          ]
        : []),
      ...deprecatedVars(input.vars || []),
    ]);
  });

  const deprecatedStreamFeatures = (packageInfo.data_streams || []).flatMap((dataStream) =>
    (dataStream.streams || []).flatMap((stream): DeprecatedFeature[] => [
      ...(stream.deprecated
        ? [
            {
              type: 'data stream' as const,
              name: stream.title || dataStream.title,
              description: stream.deprecated.description,
            },
          ]
        : []),
      ...deprecatedVars(stream.vars || []),
    ])
  );

  const deprecatedPackageVars = deprecatedVars(packageInfo.vars || []);

  const deprecatedFeatures = [
    ...deprecatedPolicyTemplateFeatures,
    ...deprecatedInputFeatures,
    ...deprecatedStreamFeatures,
    ...deprecatedPackageVars,
  ];

  if (deprecatedFeatures.length === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        data-test-subj="deprecatedFeaturesCallout"
        title={i18n.translate('xpack.fleet.epm.deprecatedFeaturesTitle', {
          defaultMessage: 'This integration contains deprecated features',
        })}
        color="warning"
        iconType="warning"
      >
        <EuiAccordion
          id="deprecatedFeaturesAccordion"
          buttonContent={i18n.translate(
            'xpack.fleet.epm.deprecatedFeaturesAccordionButtonContent',
            {
              defaultMessage: 'Expand to show all the deprecated features',
            }
          )}
        >
          <ul>
            {deprecatedFeatures.map(({ type, name, description }) => (
              <li key={`${type}-${name}`}>
                <strong>{name}</strong> ({type}): {description}
              </li>
            ))}
          </ul>
        </EuiAccordion>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
