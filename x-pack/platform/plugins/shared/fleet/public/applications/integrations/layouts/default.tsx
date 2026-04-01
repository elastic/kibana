/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useState, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiNotificationBadge,
  EuiPopover,
  EuiButtonEmpty,
  EuiSelectable,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useLink } from '../../../hooks';
import type { Section } from '../sections';

import { WithHeaderLayout } from '.';

const SUPPORTED_LOCALES: Array<{ locale: string; label: string }> = [
  { locale: 'en', label: 'English' },
  { locale: 'fr-FR', label: 'Français' },
  { locale: 'ja-JP', label: '日本語' },
  { locale: 'zh-CN', label: '中文' },
  { locale: 'de-DE', label: 'Deutsch' },
];

const LOCALE_STORAGE_KEY = 'kibana.i18n.locale';

const LanguageSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const currentLocale = i18n.getLocale();

  const options: EuiSelectableOption[] = SUPPORTED_LOCALES.map(({ locale, label }) => ({
    label: `${label} (${locale})`,
    key: locale,
    checked: locale.toLowerCase() === currentLocale.toLowerCase() ? 'on' : undefined,
  }));

  const onChange = useCallback((newOptions: EuiSelectableOption[]) => {
    const selected = newOptions.find((opt) => opt.checked === 'on');
    if (selected?.key) {
      localStorage.setItem(LOCALE_STORAGE_KEY, selected.key);
      // eslint-disable-next-line no-console
      console.log(`Locale set to "${selected.key}". Please reload the page to apply the change.`);
      setIsOpen(false);
    }
  }, []);

  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonEmpty
              iconType="globe"
              iconSide="left"
              size="s"
              onClick={() => setIsOpen(!isOpen)}
              data-test-subj="languageSelectorButton"
            >
              {SUPPORTED_LOCALES.find((l) => l.locale.toLowerCase() === currentLocale.toLowerCase())
                ?.label ?? currentLocale}
            </EuiButtonEmpty>
          }
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
          panelPaddingSize="none"
          anchorPosition="downRight"
        >
          <EuiSelectable
            singleSelection="always"
            options={options}
            onChange={onChange}
            listProps={{ bordered: false }}
          >
            {(list) => <div style={{ width: 240 }}>{list}</div>}
          </EuiSelectable>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface Props {
  section?: Section;
  children?: React.ReactNode;
  notificationsBySection?: Partial<Record<Section, number>>;
  noSpacerInContent?: boolean;
}

export const DefaultLayout: React.FC<Props> = memo(
  ({ section, children, notificationsBySection, noSpacerInContent }) => {
    const { getHref } = useLink();
    const tabs = [
      {
        name: (
          <FormattedMessage
            id="xpack.fleet.appNavigation.integrationsAllLinkText"
            defaultMessage="Browse integrations"
          />
        ),
        section: 'browse' as Section,
        href: getHref('integrations_all'),
      },
      {
        name: (
          <FormattedMessage
            id="xpack.fleet.appNavigation.integrationsInstalledLinkText"
            defaultMessage="Installed integrations"
          />
        ),
        section: 'manage' as Section,
        href: getHref('integrations_installed'),
      },
    ];

    return (
      <WithHeaderLayout
        noSpacerInContent={noSpacerInContent}
        topContent={<LanguageSelector />}
        leftColumn={
          <EuiFlexGroup direction="column" gutterSize="none" justifyContent="center">
            <EuiText>
              <h1>
                <FormattedMessage
                  id="xpack.fleet.integrationsHeaderTitle"
                  defaultMessage="Integrations"
                />
              </h1>
            </EuiText>

            <EuiSpacer size="s" />

            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <p>
                  <FormattedMessage
                    id="xpack.fleet.epm.pageSubtitle"
                    defaultMessage="Choose an integration to start collecting and analyzing your data."
                  />
                </p>
              </EuiText>
            </EuiFlexItem>

            <EuiSpacer size="s" />
          </EuiFlexGroup>
        }
        rightColumnGrow={false}
        rightColumn={undefined}
        tabs={tabs.map((tab) => {
          const notificationCount = notificationsBySection?.[tab.section];
          return {
            name: tab.name,
            append: notificationCount ? (
              <EuiNotificationBadge className="eui-alignCenter" size="m">
                {notificationCount}
              </EuiNotificationBadge>
            ) : undefined,
            href: tab.href,
            isSelected: section === tab.section,
          };
        })}
      >
        {children}
      </WithHeaderLayout>
    );
  }
);
