/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiToolTip } from '@elastic/eui';

interface Props {
  mappings: boolean;
  settings: boolean;
  aliases: boolean;
  contentWhenEmpty?: JSX.Element | null;
  isDisabled?: boolean;
}

const getColor = (flag: boolean) => (flag ? 'primary' : 'hollow');

export const TemplateContentIndicator = ({
  mappings,
  settings,
  aliases,
  contentWhenEmpty = null,
  isDisabled = false,
}: Props) => {
  if (!mappings && !settings && !aliases) {
    return contentWhenEmpty;
  }

  const texts = {
    settingsTrue: i18n.translate('xpack.idxMgmt.templateContentIndicator.indexSettingsTrueLabel', {
      defaultMessage: 'This template contains index settings',
    }),
    settingsFalse: i18n.translate(
      'xpack.idxMgmt.templateContentIndicator.indexSettingsFalseLabel',
      {
        defaultMessage: 'This template does not contain index settings',
      }
    ),
    mappingsTrue: i18n.translate('xpack.idxMgmt.templateContentIndicator.indexMappingsTrueLabel', {
      defaultMessage: 'This template contains index mappings',
    }),
    mappingsFalse: i18n.translate(
      'xpack.idxMgmt.templateContentIndicator.indexMappingsFalseLabel',
      {
        defaultMessage: 'This template does not contain index mappings',
      }
    ),
    aliasesTrue: i18n.translate('xpack.idxMgmt.templateContentIndicator.indexAliasesTrueLabel', {
      defaultMessage: 'This template contains index aliases',
    }),
    aliasesFalse: i18n.translate('xpack.idxMgmt.templateContentIndicator.indexAliasesFalseLabel', {
      defaultMessage: 'This template does not contain index aliases',
    }),
  };

  const mappingsText = mappings ? texts.mappingsTrue : texts.mappingsFalse;
  const settingsText = settings ? texts.settingsTrue : texts.settingsFalse;
  const aliasesText = aliases ? texts.aliasesTrue : texts.aliasesFalse;
  const tabIndex = isDisabled ? -1 : 0;

  return (
    <>
      <EuiToolTip content={mappingsText}>
        <EuiBadge tabIndex={tabIndex} color={getColor(mappings)} aria-label={mappingsText}>
          M
        </EuiBadge>
      </EuiToolTip>{' '}
      <EuiToolTip content={settingsText}>
        <EuiBadge tabIndex={tabIndex} color={getColor(settings)} aria-label={settingsText}>
          S
        </EuiBadge>
      </EuiToolTip>{' '}
      <EuiToolTip content={aliasesText}>
        <EuiBadge tabIndex={tabIndex} color={getColor(aliases)} aria-label={aliasesText}>
          A
        </EuiBadge>
      </EuiToolTip>
    </>
  );
};
