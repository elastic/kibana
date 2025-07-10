/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, ReactNode } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiCode,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCheckableCard,
  useEuiTheme,
  EuiPopover,
  EuiButtonIcon,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { DocLinksStart } from '@kbn/core/public';
import { IndexWarning, IndexWarningType } from '../../../../../../../../../common/types';

export const hasIndexWarning = (
  warnings: IndexWarning[],
  warningType: IndexWarningType
): boolean => {
  return Boolean(warnings.find((warning) => warning.warningType === warningType));
};

export interface WarningCheckboxProps {
  isChecked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  docLinks: DocLinksStart['links'];
  id: string;
  meta?: IndexWarning['meta'];
}

// Base component for all warning checkboxes
const BaseWarningCheckbox: React.FunctionComponent<{
  id: string;
  isChecked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  children: ReactNode;
}> = ({ id, isChecked, onChange, children }) => {
  return (
    <>
      <EuiCheckableCard
        id={id}
        checkableType="checkbox"
        checked={isChecked}
        onChange={onChange}
        label={children}
      />
      <EuiSpacer size="m" />
    </>
  );
};

// Reusable popover component with info button
const InfoPopover: React.FunctionComponent<{
  children: ReactNode;
}> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onTogglePopover = () => setIsPopoverOpen((isOpen) => !isOpen);

  const popoverId = useGeneratedHtmlId();

  const popoverStyles = css`
    margin-top: -${euiTheme.size.xs};
  `;

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          display="empty"
          iconType="info"
          onClick={onTogglePopover}
          css={popoverStyles}
          aria-labelledby={popoverId}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="leftCenter"
    >
      <EuiText size="s" style={{ width: 300 }} id={popoverId}>
        {children}
      </EuiText>
    </EuiPopover>
  );
};

export const DeprecatedSettingWarningCheckbox: React.FunctionComponent<WarningCheckboxProps> = ({
  isChecked,
  onChange,
  docLinks,
  id,
  meta,
}) => {
  return (
    <BaseWarningCheckbox id={id} isChecked={isChecked} onChange={onChange}>
      <FormattedMessage
        tagName="b"
        id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.deprecatedIndexSettingsWarningTitle"
        defaultMessage="Remove deprecated index settings"
      />
      <EuiSpacer size="m" />
      <EuiText size="s">
        <ul>
          {(meta!.deprecatedSettings as string[]).map((setting, index) => {
            return (
              <li key={`${setting}-${index}`}>
                <EuiCode>{setting}</EuiCode>
              </li>
            );
          })}
        </ul>
      </EuiText>
      <EuiSpacer size="m" />

      <EuiLink href={docLinks.elasticsearch.indexModules} target="_blank" external>
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.documentationLinkLabel"
          defaultMessage="Learn more"
        />
      </EuiLink>
    </BaseWarningCheckbox>
  );
};

const i18nStrings = {
  index: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.indexLabel',
    {
      defaultMessage: 'Index',
    }
  ),
  newIndex: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.newIndexLabel',
    {
      defaultMessage: 'New index',
    }
  ),
  alias: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.aliasLabel',
    {
      defaultMessage: 'Alias',
    }
  ),
};

export const ReplaceIndexWithAliasWarningCheckbox: React.FunctionComponent<
  WarningCheckboxProps
> = ({ isChecked, onChange, id, meta }) => {
  const { euiTheme } = useEuiTheme();

  const textStyles = css`
    p {
      word-break: break-all;
      margin-bottom: ${euiTheme.size.s};

      &:last-of-type {
        margin-bottom: 0;
      }
    }
  `;

  return (
    <BaseWarningCheckbox id={id} isChecked={isChecked} onChange={onChange}>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <FormattedMessage
            tagName="b"
            id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.replaceIndexWithAliasWarningTitle"
            defaultMessage="Replace index and create alias"
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <InfoPopover>
            <FormattedMessage
              tagName="p"
              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.replaceIndexWithAliasWarningDetail"
              defaultMessage="You can search {indexName} as before. To delete the data you'll have to delete {reindexName}"
              values={{
                indexName: <EuiCode>{meta?.indexName}</EuiCode>,
                reindexName: <EuiCode>{meta?.reindexName}</EuiCode>,
              }}
            />
          </InfoPopover>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiText grow={false} size="s" css={textStyles}>
        <p>
          {i18nStrings.index}: <EuiCode>{meta?.indexName}</EuiCode>
        </p>
        <p>
          {i18nStrings.newIndex}: <EuiCode>{meta?.reindexName}</EuiCode>
        </p>
        <p>
          {i18nStrings.alias}: <EuiCode>{meta?.indexName}</EuiCode>
        </p>
      </EuiText>
    </BaseWarningCheckbox>
  );
};

export const MakeIndexReadonlyWarningCheckbox: React.FunctionComponent<WarningCheckboxProps> = ({
  isChecked,
  onChange,
  id,
  meta,
}) => {
  return (
    <BaseWarningCheckbox id={id} isChecked={isChecked} onChange={onChange}>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <FormattedMessage
            tagName="b"
            id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.makeIndexReadonlyWarningTitle"
            defaultMessage="Set {indexName} index to read-only"
            values={{
              indexName: <EuiCode>{meta?.indexName}</EuiCode>,
            }}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <InfoPopover>
            <FormattedMessage
              tagName="p"
              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.makeIndexReadonlyWarningDetail"
              defaultMessage="You can continue to search and retrieve documents from {indexName}. You will not be able to insert new documents or modify existing ones."
              values={{
                indexName: <EuiCode>{meta?.indexName}</EuiCode>,
              }}
            />
          </InfoPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </BaseWarningCheckbox>
  );
};
