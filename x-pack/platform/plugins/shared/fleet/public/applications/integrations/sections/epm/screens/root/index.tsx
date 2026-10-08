/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: root package page. Lets the user pick a schema (ECS / OTel) and routes to the
// existing create-package-policy page for the chosen child package, passing `?root=<name>`.

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { getSchemaLabel } from '../../../../../../../common/services';
import { INTEGRATIONS_PLUGIN_ID } from '../../../../constants';
import { useLink, useStartServices } from '../../../../hooks';
import { useRootPackage } from '../../../../../../hooks/use_root_package';
import type { RootSchemaOption } from '../../../../../../hooks/use_root_package';
import { PackageIcon } from '../../../../../../components';
import { WithHeaderLayout } from '../../../../layouts';
import { getRootInstalledLabel } from '../home/hooks/apply_root_packages';

const childVersion = (option: RootSchemaOption) =>
  option.child?.installationInfo?.version ?? option.child?.version;

export const RootPackagePage: React.FC = () => {
  const { rootName } = useParams<{ rootName: string }>();
  const { getHref, getPath } = useLink();
  const { application } = useStartServices();
  const { root, options, defaultSchema, isLoading } = useRootPackage(rootName);
  const [selected, setSelected] = useState<string | undefined>();

  useEffect(() => {
    if (!selected && defaultSchema) setSelected(defaultSchema);
  }, [defaultSchema, selected]);

  if (isLoading) return <EuiSkeletonText lines={6} />;
  if (!root) {
    return (
      <EuiCallOut
        announceOnMount
        color="danger"
        title={`Root package "${rootName}" not found`}
        iconType="error"
      />
    );
  }

  const installedLabel = getRootInstalledLabel(
    options.filter((o) => o.isInstalled).map((o) => o.schema)
  );
  const selectedOption = options.find((o) => o.schema === selected);
  const selectedVersion = selectedOption && childVersion(selectedOption);

  const onContinue = () => {
    if (!selectedOption || !selectedVersion) return;
    const path = getPath('add_integration_to_policy', {
      pkgkey: `${selectedOption.packageName}-${selectedVersion}`,
      root: root.name,
      ...(selectedOption.child?.release !== 'ga' ? { prerelease: true } : {}),
    });
    application.navigateToApp(INTEGRATIONS_PLUGIN_ID, {
      path,
      state: { onCancelUrl: getHref('integration_root', { rootName: root.name }) },
    });
  };

  const header = (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <div>
          <EuiButtonEmpty
            iconType="arrowLeft"
            size="xs"
            flush="left"
            href={getHref('integrations_all')}
          >
            Back to integrations
          </EuiButtonEmpty>
        </div>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <PackageIcon
              packageName={root.name}
              version={root.version}
              icons={root.icons}
              size="xxl"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="l">
              <h1 data-test-subj="rootPackageTitle">{root.title}</h1>
            </EuiTitle>
          </EuiFlexItem>
          {installedLabel && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="success" iconType="check">
                {installedLabel}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued">{root.description}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <WithHeaderLayout leftColumn={header}>
      <EuiTitle size="s">
        <h2>Choose a data schema</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="m" style={{ maxWidth: 640 }}>
        {options.map((option) => {
          const version = childVersion(option);
          return (
            <EuiFlexItem key={option.schema}>
              <EuiCheckableCard
                id={`rootSchema-${option.schema}`}
                data-test-subj={`rootSchemaOption-${option.schema}`}
                name="rootSchema"
                disabled={!option.child}
                checked={selected === option.schema}
                onChange={() => setSelected(option.schema)}
                label={
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <strong>{getSchemaLabel(option.schema)}</strong>
                    </EuiFlexItem>
                    {option.schema === defaultSchema && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">Recommended</EuiBadge>
                      </EuiFlexItem>
                    )}
                    {option.isInstalled && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="success">Installed</EuiBadge>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                }
              >
                <EuiText size="s" color="subdued">
                  {option.child
                    ? `${option.child.title} (${option.packageName} ${version})`
                    : `${option.packageName} ${option.versionConstraint} is not available in the registry`}
                </EuiText>
              </EuiCheckableCard>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiButton
        fill
        iconType="plusInCircle"
        disabled={!selectedVersion}
        onClick={onContinue}
        data-test-subj="rootSchemaContinue"
      >
        {`Add ${root.title}`}
      </EuiButton>
    </WithHeaderLayout>
  );
};
