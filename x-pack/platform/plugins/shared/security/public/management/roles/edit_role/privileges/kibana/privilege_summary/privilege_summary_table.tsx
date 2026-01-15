/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiInMemoryTable,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React, { Fragment, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Role, RoleKibanaPrivilege } from '@kbn/security-plugin-types-common';
import {
  isGlobalPrivilegeDefinition,
  type KibanaPrivileges,
  type PrimaryFeaturePrivilege,
  type SecuredFeature,
} from '@kbn/security-role-management-model';
import { FeatureTableCell } from '@kbn/security-ui-components';
import type { Space, SpacesApiUi } from '@kbn/spaces-plugin/public';

import type { EffectiveFeaturePrivileges } from './privilege_summary_calculator';
import { PrivilegeSummaryCalculator } from './privilege_summary_calculator';
import { PrivilegeSummaryExpandedRow } from './privilege_summary_expanded_row';
import { SpaceColumnHeader } from './space_column_header';
import { ALL_SPACES_ID } from '../../../../../../../common/constants';

export interface PrivilegeSummaryTableProps {
  role: Role;
  spaces: Space[];
  kibanaPrivileges: KibanaPrivileges;
  canCustomizeSubFeaturePrivileges: boolean;
  spacesApiUi: SpacesApiUi;
}

function getColumnKey(entry: RoleKibanaPrivilege) {
  return `privilege_entry_${entry.spaces.join('|')}`;
}

function showPrivilege({
  allSpacesSelected,
  primaryFeature,
  globalPrimaryFeature,
}: {
  allSpacesSelected: boolean;
  primaryFeature?: PrimaryFeaturePrivilege;
  globalPrimaryFeature?: PrimaryFeaturePrivilege;
}) {
  if (
    primaryFeature?.name == null ||
    primaryFeature?.disabled ||
    (primaryFeature?.requireAllSpaces && !allSpacesSelected)
  ) {
    return 'None';
  }

  // If primary feature requires all spaces we cannot rely on primaryFeature.name.
  // Example:
  // primaryFeature: feature with requireAllSpaces in space-a has all privileges set to All
  // globalPrimaryFeature: feature in *AllSpaces has privileges set to Read (this is the correct one to display)
  if (primaryFeature?.requireAllSpaces && allSpacesSelected) {
    return globalPrimaryFeature?.name ?? 'None';
  }

  return primaryFeature?.name;
}

export const PrivilegeSummaryTable = (props: PrivilegeSummaryTableProps) => {
  const [expandedFeatures, setExpandedFeatures] = useState<string[]>([]);

  const featureCategories = useMemo(() => {
    const featureCategoryMap = new Map<string, SecuredFeature[]>();

    props.kibanaPrivileges
      .getSecuredFeatures()
      .filter((feature) => feature.privileges != null || feature.reserved != null)
      .forEach((feature) => {
        if (!featureCategoryMap.has(feature.category.id)) {
          featureCategoryMap.set(feature.category.id, []);
        }
        featureCategoryMap.get(feature.category.id)!.push(feature);
      });

    return featureCategoryMap;
  }, [props.kibanaPrivileges]);

  const calculator = new PrivilegeSummaryCalculator(props.kibanaPrivileges, props.role);

  const toggleExpandedFeature = (featureId: string) => {
    if (expandedFeatures.includes(featureId)) {
      setExpandedFeatures(expandedFeatures.filter((ef) => ef !== featureId));
    } else {
      setExpandedFeatures([...expandedFeatures, featureId]);
    }
  };

  const featureColumn: EuiBasicTableColumn<any> = {
    name: 'Feature',
    field: 'feature',
    render: (feature: any) => {
      return <FeatureTableCell feature={feature} />;
    },
  };
  const rowExpanderColumn: EuiBasicTableColumn<any> = {
    align: 'right',
    width: '40px',
    isExpander: true,
    field: 'featureId',
    name: '',
    render: (featureId: string, record: any) => {
      const feature = record.feature as SecuredFeature;
      const hasSubFeaturePrivileges = feature.getSubFeaturePrivileges().length > 0;
      if (!hasSubFeaturePrivileges) {
        return null;
      }
      return (
        <EuiButtonIcon
          onClick={() => toggleExpandedFeature(featureId)}
          data-test-subj={`expandPrivilegeSummaryRow`}
          aria-label={expandedFeatures.includes(featureId) ? 'Collapse' : 'Expand'}
          iconType={expandedFeatures.includes(featureId) ? 'arrowUp' : 'arrowDown'}
        />
      );
    },
  };

  const rawKibanaPrivileges = [...props.role.kibana].sort((entry1, entry2) => {
    if (isGlobalPrivilegeDefinition(entry1)) {
      return -1;
    }
    if (isGlobalPrivilegeDefinition(entry2)) {
      return 1;
    }
    return 0;
  });

  const globalRawPrivilege = rawKibanaPrivileges.find((entry) =>
    isGlobalPrivilegeDefinition(entry)
  );

  const globalPrivilege = globalRawPrivilege
    ? calculator.getEffectiveFeaturePrivileges(globalRawPrivilege)
    : null;

  const privilegeColumns = rawKibanaPrivileges.map((entry) => {
    const key = getColumnKey(entry);
    return {
      name: (
        <SpaceColumnHeader entry={entry} spaces={props.spaces} spacesApiUi={props.spacesApiUi} />
      ),
      field: key,
      render: (kibanaPrivilege: EffectiveFeaturePrivileges, record: { featureId: string }) => {
        const { primary, hasCustomizedSubFeaturePrivileges } = kibanaPrivilege[record.featureId];
        let iconTip = null;
        if (hasCustomizedSubFeaturePrivileges) {
          iconTip = (
            <EuiIconTip
              size="s"
              type="info"
              content={
                <span>
                  <FormattedMessage
                    id="xpack.security.management.editRole.privilegeSummary.additionalPrivilegesGrantedIconTip"
                    defaultMessage="Additional privileges granted. Expand this row for more information."
                  />
                </span>
              }
            />
          );
        } else {
          iconTip = <EuiIcon size="s" type="empty" />;
        }
        return (
          <span
            data-test-subj={`privilegeColumn ${
              hasCustomizedSubFeaturePrivileges ? 'additionalPrivilegesGranted' : ''
            }`}
          >
            {showPrivilege({
              allSpacesSelected: props.spaces.some((space) => space.id === ALL_SPACES_ID),
              primaryFeature: primary,
              globalPrimaryFeature: globalPrivilege?.[record.featureId]?.primary,
            })}{' '}
            {iconTip}
          </span>
        );
      },
    };
  });

  const columns: Array<EuiBasicTableColumn<any>> = [];
  if (props.canCustomizeSubFeaturePrivileges) {
    columns.push(rowExpanderColumn);
  }
  columns.push(featureColumn, ...privilegeColumns);

  const privileges = rawKibanaPrivileges.reduce<
    Record<string, [string[], EffectiveFeaturePrivileges]>
  >((acc, entry) => {
    return {
      ...acc,
      [getColumnKey(entry)]: [entry.spaces, calculator.getEffectiveFeaturePrivileges(entry)],
    };
  }, {});

  const accordions: any[] = [];

  featureCategories.forEach((featuresInCategory) => {
    const { category } = featuresInCategory[0];

    const buttonContent = (
      <EuiFlexGroup
        data-test-subj={`featureCategoryButton_${category.id}`}
        alignItems={'center'}
        responsive={false}
        gutterSize="m"
      >
        {category.euiIconType ? (
          <EuiFlexItem grow={false}>
            <EuiIcon size="m" type={category.euiIconType} />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={1}>
          <EuiTitle size="xs">
            <h4 className="eui-displayInlineBlock">{category.label}</h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    const categoryPrivileges = Object.fromEntries(
      Object.entries(privileges).map(([key, [, featurePrivileges]]) => [key, featurePrivileges])
    );

    const categoryItems = featuresInCategory.map((feature) => {
      return {
        feature,
        featureId: feature.id,
        ...categoryPrivileges,
      };
    });

    accordions.push(
      <EuiAccordion
        id={`privilegeSummaryFeatureCategory_${category.id}`}
        data-test-subj={`privilegeSummaryFeatureCategory_${category.id}`}
        key={category.id}
        buttonContent={buttonContent}
        initialIsOpen={true}
      >
        <EuiInMemoryTable
          columns={columns}
          items={categoryItems}
          itemId="featureId"
          rowProps={(record) => {
            return {
              'data-test-subj': `summaryTableRow-${record.featureId}`,
            };
          }}
          itemIdToExpandedRowMap={expandedFeatures.reduce((acc, featureId) => {
            return {
              ...acc,
              [featureId]: (
                <PrivilegeSummaryExpandedRow
                  feature={props.kibanaPrivileges.getSecuredFeature(featureId)}
                  effectiveFeaturePrivileges={Object.values(privileges).map(([spaces, privs]) => [
                    spaces,
                    privs[featureId],
                  ])}
                />
              ),
            };
          }, {})}
          tableCaption={i18n.translate(
            'xpack.security.management.editRole.privilegeSummaryTable.categoryCaption',
            {
              defaultMessage: 'Privileges for {categoryLabel}',
              values: { categoryLabel: category.label },
            }
          )}
        />
      </EuiAccordion>
    );
  });

  return (
    <>
      {accordions.map((a, idx) => (
        <Fragment key={idx}>
          {a}
          <EuiSpacer />
        </Fragment>
      ))}
    </>
  );
};
