/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCheckbox,
  EuiCode,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DocLinksStart } from '@kbn/core/public';
import {
  DataStreamReindexWarning,
  DataStreamReindexWarningTypes,
  ReindexWarning,
} from '../../../../../../../../../common/types';

export const hasReindexWarning = (
  warnings: DataStreamReindexWarning[],
  warningType: DataStreamReindexWarningTypes
): boolean => {
  return Boolean(warnings.find((warning) => warning.warningType === warningType));
};

const WarningCheckbox: React.FunctionComponent<{
  isChecked: boolean;
  warningId: string;
  label: React.ReactNode;
  description: React.ReactNode;
  documentationUrl?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ isChecked, warningId, label, onChange, description, documentationUrl }) => (
  <>
    <EuiText>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id={warningId}
            label={<strong>{label}</strong>}
            checked={isChecked}
            onChange={onChange}
          />
        </EuiFlexItem>
        {documentationUrl !== undefined && (
          <EuiFlexItem grow={false}>
            <EuiLink href={documentationUrl} target="_blank" external={false}>
              <EuiIconTip
                content={
                  <FormattedMessage
                    id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.documentationLinkLabel"
                    defaultMessage="Documentation"
                  />
                }
                position="right"
                type="help"
              />
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="xs" />

      {description}
    </EuiText>

    <EuiSpacer />
  </>
);

export interface WarningCheckboxProps {
  isChecked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  docLinks: DocLinksStart['links'];
  id: string;
  meta?: ReindexWarning['meta'];
}

export const DeprecatedSettingWarningCheckbox: React.FunctionComponent<WarningCheckboxProps> = ({
  isChecked,
  onChange,
  docLinks,
  id,
  meta,
}) => {
  return (
    <WarningCheckbox
      isChecked={isChecked}
      onChange={onChange}
      warningId={id}
      label={
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.deprecatedIndexSettingsWarningTitle"
          defaultMessage="Remove deprecated index settings"
        />
      }
      description={
        <>
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.deprecatedIndexSettingsWarningDetail"
            defaultMessage="The following deprecated index settings were detected:"
          />

          <EuiSpacer size="xs" />

          <ul>
            {(meta!.deprecatedSettings as string[]).map((setting, index) => {
              return (
                <li key={`${setting}-${index}`}>
                  <EuiCode>{setting}</EuiCode>
                </li>
              );
            })}
          </ul>
        </>
      }
      documentationUrl={docLinks.elasticsearch.indexModules}
    />
  );
};

export const IncompatibleDataInDataStreamWarningCheckbox: React.FunctionComponent<
  WarningCheckboxProps
> = ({ isChecked, onChange, docLinks, id, meta }) => {
  return (
    <WarningCheckbox
      isChecked={isChecked}
      onChange={onChange}
      warningId={id}
      label={
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.replaceIndexWithAliasWarningTitle"
          defaultMessage="Reindex all incompatible data for this data stream"
        />
      }
      description={null}
    />
  );
};
